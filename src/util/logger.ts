import marked from 'marked';
import TerminalRenderer from 'marked-terminal';

// Configure marked to use terminal renderer with VSCode-compatible options
marked.setOptions({
    renderer: new (TerminalRenderer as any)({
        // These colors work in both VSCode and Terminal
        colors: {
            bold: '\x1b[1m',
            blue: '\x1b[34;1m',
            lightBlue: '\x1b[36;1m',
            yellow: '\x1b[33;1m',
            red: '\x1b[31;1m',
            gray: '\x1b[90m',
            reset: '\x1b[0m'
        }
    })
});

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info', 
    WARN = 'warn',
    ERROR = 'error'
}

/**
 * Converts markdown text to ANSI formatted string
 * @param text Input markdown text
 * @returns ANSI formatted string
 */
function markdownToAnsi(text: string): string {
    // Handle bold text (wrapped in ** or __)
    text = text.replace(/(\*\*|__)(.*?)\1/g, '\x1b[1m$2\x1b[0m');
    
    // Handle italic text (wrapped in * or _) with yellow color
    text = text.replace(/(\*|_)(.*?)\1/g, '\x1b[33m$2\x1b[0m');
    
    return text;
}


export class Logger {
    private static instance: Logger;

    private constructor() { }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public static debug(message: string): void {
        Logger.log(message, LogLevel.DEBUG);
    }

    public static info(message: string): void {
        Logger.log(message, LogLevel.INFO);
    }

    public static warn(message: string): void {
        Logger.log(message, LogLevel.WARN);
    }

    public static error(message: string): void {
        Logger.log(`**${message}**`, LogLevel.ERROR);
    }

    public static log(message: string, level: LogLevel = LogLevel.INFO): void {
        // Get current timestamp in required format
        const now = new Date();
        const timestamp = now.toISOString()
            .replace('T', ' ')
            .replace('Z', '')
            .slice(0, 23);

        // Create formatted message with bold timestamp
        const formattedMessage = `**[${timestamp}]** ${message}`;
        const renderedMessage = (marked.parse(formattedMessage) as string).trim();
        
        switch (level) {
            case LogLevel.DEBUG:
                console.log('\x1b[90m' + renderedMessage + '\x1b[0m'); // Gray color for debug
                break;
            case LogLevel.INFO:
                console.log('\x1b[36m' + renderedMessage + '\x1b[0m'); // Light blue for info
                break;
            case LogLevel.WARN:
                console.log('\x1b[33m' + renderedMessage + '\x1b[0m'); // Yellow for warn
                break;
            case LogLevel.ERROR:
                console.log('\x1b[31m' + renderedMessage + '\x1b[0m'); // Red for error
                break;
            default:
                console.log(renderedMessage);
        }
    }
}
