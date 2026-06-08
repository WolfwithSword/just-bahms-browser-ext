### Building the extension

_Use Node v22.14.0_

1. Install dependencies:
```console
cd extension
npm install
```

2. Build the extension (chromium):
```console
node build.js chrome
```
### or
2. Build the extension (firefox):
```console
node build.js firefox
```

3. You can find the files for the extension inside `dist/`.

### Structure of the project

- `content.ts` is the frontend script. It can interact with the web page and is used to read the usernames in the chat and create and insert the corresponding icons.
- `popup.html` / `popup.ts` is the popup displayed when opening the extension settings. The html handles the display of the popup while the js file stores the settings in the local browser storage.

### Credits

Using [minasona-extension](https://github.com/minasona-extension/community) as the base for the usercard injection.
