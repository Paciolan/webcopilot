const fs = require('fs');
const path = require('path');
import Anthropic from '@anthropic-ai/sdk';
import config from 'config';
import { Logger } from './logger';

export class LLM {
    private static instance: LLM;
    private anthropic: Anthropic;
    private config: {
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        topP: number;
        topK: number;
        frequencyPenalty: number;
        presencePenalty: number;
    };
    private cache: {
        enabled: boolean;
        path: string;
    };

    private constructor() {
        this.config = config.get('claude');
        this.cache = config.get('llm.cache');
        this.anthropic = new Anthropic({
            apiKey: this.config.apiKey,
        });
    }

    public static getInstance(): LLM {
        if (!LLM.instance) {
            LLM.instance = new LLM();
        }
        return LLM.instance;
    }

    public static async writeLLMCache(prompt: string, llmResponse: string): Promise<string | null> {
        if (!LLM.getInstance().cache.enabled) {
            return null;
        }

        const fs = require('fs');
        const crypto = require('crypto');
        const path = require('path');

        // Create cache directory if it doesn't exist
        const cacheDir = 'llm_cache';
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }

        // Generate MD5 hash of prompt
        const md5Hash = crypto.createHash('md5').update(prompt).digest('hex');
        
        // Create cache content
        const cacheContent = {
            prompt: prompt,
            llmResponse: llmResponse
        };

        // Write to cache file
        const cacheFile = path.join(cacheDir, `${md5Hash}.txt`);
        await fs.promises.writeFile(
            cacheFile,
            JSON.stringify(cacheContent, null, 4),
            'utf8'
        );

        return md5Hash;
    }

    public static async readLLMCache(prompt: string): Promise<[string | null, string | null]> {
        if (!LLM.getInstance().cache.enabled) {
            return [null, null];
        }

        const fs = require('fs');
        const crypto = require('crypto');
        const path = require('path');

        // Generate MD5 hash of prompt (same as in write)
        const md5Hash = crypto.createHash('md5').update(prompt).digest('hex');
        
        // Construct cache file path
        const cacheDir = 'llm_cache';
        const cacheFile = path.join(cacheDir, `${md5Hash}.txt`);

        try {
            // Check if cache file exists
            if (!fs.existsSync(cacheFile)) {
                return [null, null];
            }

            // Read and parse cache file
            const cacheContent = JSON.parse(
                await fs.promises.readFile(cacheFile, 'utf8')
            );

            return [cacheContent.llmResponse, md5Hash];
        } catch (error) {
            Logger.debug(`Error reading LLM cache: ${error}`);
            return [null, null];
        }
    }

    public static async invoke(prompt: string, limitedBase64Strings: string[]): Promise<[string, string | null]> {
        // try to read the cache
        const [cachedResponse, cacheHash] = await LLM.readLLMCache(prompt);
        if (cachedResponse) {
            Logger.debug(`LLM cache hit for prompt: ${cacheHash}::${prompt.substring(0, 128)}`);
            return [cachedResponse, cacheHash];
        }

        // call the LLM
        const instance = LLM.getInstance();
        
        const message = await instance.anthropic.messages.create({
            model: instance.config.model,
            max_tokens: instance.config.maxTokens,
            temperature: instance.config.temperature,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: prompt
                        },
                        ...limitedBase64Strings.map(base64String => ({
                            type: 'image' as const,
                            source: {
                                type: 'base64' as const,
                                media_type: 'image/png' as const,
                                data: base64String
                            }
                        }))
                    ]
                }
            ]
        });

        const llmResponse = (message.content[0] as { text: string }).text;
        Logger.debug(`LLM response: ${llmResponse}`);

        // write the cache
        const md5Hash = await LLM.writeLLMCache(prompt, llmResponse);
        Logger.debug(`LLM cache written for prompt: ${md5Hash}::${prompt.substring(0, 128)}`);

        return [llmResponse, md5Hash];
    }

    public static applyTemplate(prompt: string,): string {
        const now = new Date();
        const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const time = now.toTimeString().split(' ')[0]; // HH:MM:SS

        return prompt
            .replace(/{date}/g, date)
            .replace(/{time}/g, time);
    }

    public static removeCache(cacheHash: string): void {
        const cacheDir = LLM.getInstance().cache.path;
        const cacheFile = path.join(cacheDir, `${cacheHash}.txt`);

        if (fs.existsSync(cacheFile)) {
            fs.unlinkSync(cacheFile);
            Logger.debug(`Cache file deleted: ${cacheFile}`);
        }
    }
} 