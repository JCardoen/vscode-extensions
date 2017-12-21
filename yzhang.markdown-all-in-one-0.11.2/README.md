# Markdown Support for Visual Studio Code

[![version](https://img.shields.io/vscode-marketplace/v/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![installs](https://img.shields.io/vscode-marketplace/d/yzhang.markdown-all-in-one.svg?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one)  
[![AppVeyor](https://img.shields.io/appveyor/ci/neilsustc/vscode-markdown.svg?style=flat-square&label=appveyor%20build)](https://ci.appveyor.com/project/neilsustc/vscode-markdown)  
[![GitHub stars](https://img.shields.io/github/stars/neilsustc/vscode-markdown.svg?style=flat-square&label=github%20stars)](https://github.com/neilsustc/vscode-markdown)

All you need for Markdown (keyboard shortcuts, table of contents, auto preview and more).

## Features

- **Keyboard shortcuts** (toggle bold, italic, code span, strikethrough and heading)
  - Different behaviors depending on the context (see instruction below)
  - *Quick styling mode*: toggle bold/italic without selecting words
- **Table of contents** (No additional annoying tags like `<!-- TOC -->`)
- **Outline view** in explorer panel
- **Automatically show preview** when opening a Markdown file (Disabled by default)
  - ~~Automatically close preview when changing editor~~
- **Print your Markdown to HTML/PDF** (PDF not yet finished)
- **List editing** (when pressing <kbd>Enter</kbd> at the end of a list item) (also work for quote block)
  - Pressing <kbd>Tab</kbd> at the beginning of a list item will indent it
  - Pressing <kbd>Backspace</kbd> at the beginning of a list item will unindent it (or delete the list marker)
  - Blank list item won't be continued
  - *Note*: there is an option to choose ordered list marker: always `1.` or ordered number.
- **GitHub Flavored Markdown**
  - Table formatter
  - Task lists
- **Word completion** (moved to a standalone extension [Dictionary Completion](https://marketplace.visualstudio.com/items?itemName=yzhang.dictionary-completion))

### Keyboard Shortcuts

![shortcuts1](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/bold-normal.gif)

![shortcuts2](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/bold-quick.gif)

![shortcuts3](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/heading.gif)

### Table of Contents

![toc](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/toc.gif)

### List Editing

![list editing](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/list-editing.gif)

### Table Formatter

![table formatter](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/table-formatter.gif)

### Outline

![outline](https://github.com/neilsustc/vscode-markdown/raw/master/images/outline.png)

### Task Lists

![task lists](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/tasklists.gif)

<!-- ### Print to PDF

![print to pdf](https://github.com/neilsustc/vscode-markdown/raw/master/images/gifs/pdf.gif) -->

## Shortcuts

| Key | Command |
| --- | --- |
| <kbd>ctrl</kbd> + <kbd>b</kbd> | Toggle bold |
| <kbd>ctrl</kbd> + <kbd>i</kbd> | Toggle italic |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>]</kbd> | Toggle heading (uplevel) |
| <kbd>ctrl</kbd> + <kbd>shift</kbd> + <kbd>[</kbd> | Toggle heading (downlevel) |
| <kbd>alt</kbd> + <kbd>c</kbd> | Check/Uncheck task list item |

## Available Commands

- Markdown: Create Table of Contents
- Markdown: Update Table of Contents
- Markdown: Toggle code span
- Markdown: Toggle strikethrough
- Markdown: Print current document to HTML (*preview*)

## Supported Settings

| Name | Default | Description |
| --- | --- | --- |
| `markdown.extension.toc.levels` | `1..6` | Control the heading levels to show in the table of contents. |
| `markdown.extension.toc.orderedList` | `false` | Use ordered list in the table of contents. |
| `markdown.extension.toc.plaintext` | `false` | Just plain text. |
| `markdown.extension.toc.updateOnSave` | `false` | Automatically update the table of contents on save. |
| `markdown.extension.preview.autoShowPreviewToSide` | `false` | Automatically show preview when opening a Markdown file. |
| `markdown.extension.orderedList.marker` | `one` | Start a list item always with '1.' or in increasing numerical order (using option `ordered`) |
| `markdown.extension.italic.indicator` | `*` | Use `*` or `_` to wrap italic text |
| `markdown.extension.quickStyling` | `false` | Toggle bold/italic without selecting words |
| `markdown.extension.showExplorer` | `true` | Show outline view in explorer panel |

## Changelog

### 0.11.2 (2017.11.23)

- **New**: Option `markdown.extension.tableFormatter.enabled` ([#51](https://github.com/neilsustc/vscode-markdown/issues/51))
- **Fix**: Show outline only when current doc is Markdown ([#40](https://github.com/neilsustc/vscode-markdown/issues/40))
- **Fix**: Now option `editor.tabCompletion` is correctly handled ([#55](https://github.com/neilsustc/vscode-markdown/issues/55))
- **Fix**: Now if you export Markdown to HTML, all CSS will be embedded rather than referred ([#57](https://github.com/neilsustc/vscode-markdown/issues/57))

### 0.11.1 (2017.11.02)

- **New**: Use <kbd>Tab</kbd>/<kbd>Backspace</kbd> key to indent/outdent task list ([#50](https://github.com/neilsustc/vscode-markdown/issues/50))

See [CHANGELOG](https://github.com/neilsustc/vscode-markdown/blob/master/CHANGELOG.md) for more information.

## Contributing

Bugs, feature requests and more, in [GitHub Issues](https://github.com/neilsustc/vscode-markdown/issues).

Or write a review on [vscode marketplace](https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one#review-details) 😉.

## If You Would Like to ...

Vote for prospective vscode features (Add 👍 to GitHub issues):

- Open `.pdf`, `.xlsx` etc. in vscode [#12176](https://github.com/Microsoft/vscode/issues/12176)
- Support setting font-size in Decoration [#9078](https://github.com/Microsoft/vscode/issues/9078)
