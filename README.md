# WebPilot

## Introduction

WebPilot is a multimodal LLM-based AI web automation agent powered by Puppeteer. It combines the power of large language models with browser automation to create intelligent, adaptable web automation scripts. By leveraging visual and textual understanding, WebPilot can interpret web pages and perform actions more reliably than traditional selector-based automation tools.

## Installation

You can install WebPilot globally using npm:

```bash
npm install -g webpilot
```

Or run it directly using npx:

```bash
npx webpilot -s your-script.txt
```

## Usage

### Command Line Arguments

```bash
npx webpilot [options]

Options:
-s, --script <path> Path to script file (required)
-h, --headless Run in headless mode
-c, --chrome Use system installed Chrome
-k, --key <key> Override default API key
```

### Configuration

You can override default configurations by creating a `.webpilot_config.yml` file in your project directory. Below are the available configuration options:

```yaml
behavior:
    headless: true # Run browser in headless mode
    useChrome: false # Use system Chrome instead of bundled Chromium
viewport:
    width: 1024 # Browser viewport width
    height: 1024 # Browser viewport height
network:
    block: # Array of URLs to block (e.g., analytics)
        - ".googletagmanager.com/"
        - ".google-analytics.com/"
retry:
    enabled: true # Enable retry mechanism
    maxRetries: 3 # Maximum number of retry attempts
    retryDelay: 5000 # Delay between retries in milliseconds
llm:
    cache:
        enabled: true # Enable LLM response caching
        path: "llm_cache" # Path to cache directory
claude:
    apiKey: "your-api-key-here" # Anthropic API key
    model: "claude-3-5-sonnet-20241022" # Claude model to use
    temperature: 0.7 # Model temperature (0-1)
    maxTokens: 1024 # Maximum tokens in response
    topP: 1 # Top P sampling parameter
    topK: 1 # Top K sampling parameter
    frequencyPenalty: 0 # Frequency penalty for token generation
    presencePenalty: 0 # Presence penalty for token generation
```

Create a `.webpilot_config.yml` file in your project directory with any of the above settings to override the defaults. For example:

```yaml
behavior:
    headless: false
    useChrome: true
```

This will run the browser in non-headless mode using system Chrome with a larger viewport.

## Development

### Local Testing

You can test the package locally before publishing to NPM using two approaches:

#### 1. Using npm link (Recommended)
```bash
# In your webpilot project directory
npm run build       # Build the TypeScript files
npm link            # Create a global link

# Now you can use npx webpilot from anywhere
npx webpilot -s your-script.txt
```

#### 2. Using the full path
```bash
# In your webpilot project directory
npm run build        # Build the TypeScript files
npx ./dist/index.js -s your-script.txt
```

To unlink the package when you're done testing:
```bash
npm unlink webpilot
```

### Project Structure
```
webpilot/
├── src/             # Source files
├── dist/            # Compiled JavaScript files
├── config/          # Configuration files
│   └── default.yml  # Default configuration
└── tests/           # Test files
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

## Roadmap

The following features and improvements are planned for future releases:

- **GitHub Actions (CI/CD)**: Automated build and testing pipeline; Automated release creation.
- **Enhanced Memory System**: Persistent conversation memory across sessions; Context-aware responses based on chat history.
- **Advanced Image Capabilities**: Support for multiple image inputs in a single prompt.
- **Chat History Management**: Searchable conversation history; Export/import conversation logs.
- **Advanced Clipboard Integration**: Auto-copy selected text before launching; Smart paste detection and formatting; Clipboard history integration.

## License

This project is open-sourced under the MIT License - see the LICENSE file for details.

## Author

- Xiaohan "Clement" Tian ([GitHub](https://github.com/Xiaohan-Tian), [ctian@paciolan.com](mailto:ctian@paciolan.com))
- Leo Huang ([GitHub](https://github.com/LEOUS2013), [lhuang@paciolan.com](mailto:lhuang@paciolan.com))
- Ada Lo ([alo@paciolan.com](mailto:alo@paciolan.com))
- Joel Thoms ([GitHub](https://github.com/joelnet), [jthoms@paciolan.com](mailto:jthoms@paciolan.com))
- Queensley Lim ([qmlim@uci.edu](mailto:qmlim@uci.edu))
- Jenny Noh ([<eunseon@uci.edu>](mailto:eunseon@uci.edu))
- William He ([<ahe13@uci.edu>](mailto:ahe13@uci.edu))
- Feiyang Jin ([<feiyanj2@uci.edu>](mailto:feiyanj2@uci.edu))
- Kiran Maya Sheikh ([<kmsheikh@uci.edu>](mailto:kmsheikh@uci.edu))
- Vianey Flores Mursio ([<vianeyf@uci.edu>](mailto:vianeyf@uci.edu))
