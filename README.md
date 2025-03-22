# WebCopilot

## Introduction

WebCopilot is a multimodal LLM-based AI web automation agent powered by Puppeteer. It combines the power of large language models with browser automation to create intelligent, adaptable web automation scripts. By leveraging visual and textual understanding, WebCopilot can interpret web pages and perform actions more reliably than traditional selector-based automation tools.

## Installation

You can install WebCopilot globally using npm:

```bash
npm install -g webcopilot
```

Or run it directly using npx:

```bash
npx webcopilot -s your-script.txt
```

### API Key Setup

WebCopilot requires a valid Anthropic API key to use the Claude LLM APIs. You can set up your API key using one of the following methods:

1. **Environment Variable** (recommended): Set the `ANTHROPIC_API_KEY` environment variable:
   
   **For macOS:**
   ```bash
   # For temporary use in current terminal session
   export ANTHROPIC_API_KEY=your_api_key_here
   
   # For persistent use (add to your shell profile)
   echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.zshrc
   source ~/.zshrc
   ```
   
   **For Linux:**
   ```bash
   # For temporary use in current terminal session
   export ANTHROPIC_API_KEY=your_api_key_here
   
   # For persistent use (add to your shell profile)
   echo 'export ANTHROPIC_API_KEY=your_api_key_here' >> ~/.bashrc
   source ~/.bashrc
   ```
   
   **For Windows Command Prompt:**
   ```cmd
   # For temporary use in current session
   set ANTHROPIC_API_KEY=your_api_key_here
   
   # For persistent use
   setx ANTHROPIC_API_KEY your_api_key_here
   ```
   
   **For Windows PowerShell:**
   ```powershell
   # For temporary use in current session
   $env:ANTHROPIC_API_KEY = "your_api_key_here"
   
   # For persistent use
   [Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your_api_key_here", "User")
   ```

2. **Command Line Argument**: Provide the key directly when running WebCopilot:
   ```bash
   npx webcopilot -s your-script.txt -k your_api_key_here
   ```
   
3. **Configuration File**: Add your API key to the `.webcopilot_config.yml` file in your project directory (see the Configuration section below).

## Script Format

WebCopilot uses simple text files containing natural language instructions to automate web interactions. Each line in the script represents a single action to be performed.

### Creating Scripts

Create a `.txt` file containing your automation steps. Each line should describe one action in natural language. For example:

```txt
navigate to https://example.com
type "search term" into the search box
click the "Submit" button
I should see the search results page
```

### Supported Actions

WebCopilot currently supports the following types of actions:

- **Navigate**: Go to a specific URL
  - Example: `navigate to https://example.com`

- **Type**: Enter text into form fields
  - Example: `type "Hello World" into the input field`

- **Click**: Click on elements
  - Example: `click the Submit button`

- **Expect**: Verify elements or content is present
  - Example: `I should see the login form`

### Example Script

Here's a complete example script that searches UCI's website:

```txt
navigate to https://uci.edu
type "Computer Science" into the search bar on the top right
click the "web" button
click the title of the first item in the search results
I should see the Department of Computer Science home page
```

## Usage

### Command Line Arguments

```bash
npx webcopilot [options]

Options:
-s, --script <path> Path to script file (required)
-h, --headless Run in headless mode
-c, --chrome Use system installed Chrome
-k, --key <key> Override default API key
```

### Configuration

You can override the default configurations by creating a `.webcopilot_config.yml` file in your project directory. Below are the available configuration options with their default values:

```yaml
behavior:
    headless: false # Run browser in headless mode (false shows the browser UI)
    useChrome: false # Use system Chrome instead of bundled Chromium
    keepAlive: false # Keep browser window open after script finishes executing
viewport:
    width: 1024 # Browser viewport width
    height: 1024 # Browser viewport height
network:
    block: # Array of URLs to block (e.g., analytics)
        - "*.googletagmanager.com/*"
        - "*.google-analytics.com/*"
retry:
    enabled: true # Enable retry mechanism
    maxRetries: 3 # Maximum number of retry attempts
    retryDelay: 5000 # Delay between retries in milliseconds
llm:
    cache:
        enabled: false # Enable LLM response caching
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

Create a `.webcopilot_config.yml` file in your project directory with any of the above settings to override the defaults. For example:

```yaml
behavior:
    headless: true # Run browser without GUI (headless mode)
    useChrome: true # Use system Chrome browser instead of bundled Chromium
```

This will run the browser in non-headless mode using system Chrome with a larger viewport.

### Caching Considerations

- Currently, the caching mechanism in WebCopilot only detects if the prompt is the same as previous calls. The attached snapshots are not being considered in the cache key.
- If you are expecting the webpage to dynamically change between runs, please don't enable the caching feature as it may return stale responses.
- We plan to implement image comparison for the caching feature in a future release.

## Development

### Local Testing

You can test the package locally before publishing to NPM using two approaches:

#### 1. Using npm link (Recommended)
```bash
# In your webcopilot project directory
npm run build       # Build the TypeScript files
npm link            # Create a global link

# Now you can use npx webcopilot from anywhere
npx webcopilot -s your-script.txt
```

#### 2. Using the full path
```bash
# In your webcopilot project directory
npm run build        # Build the TypeScript files
npx ./dist/index.js -s your-script.txt
```

To unlink the package when you're done testing:
```bash
npm unlink webcopilot
```

### Project Structure
```
webcopilot/
├── src/             # Source files
├── dist/            # Compiled JavaScript files
├── config/          # Configuration files
│   └── default.yml  # Default configuration
└── tests/           # Test files
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request.

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
