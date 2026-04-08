# @dhruv2mars/offdex

Install the Offdex bridge CLI globally:

```bash
npm install -g @dhruv2mars/offdex
```

Then run:

```bash
offdex
```

The package downloads the matching native runtime for your platform from GitHub Releases.

Supported targets:

- macOS `arm64`
- macOS `x64`
- Linux `arm64`
- Linux `x64`
- Windows `x64`

Common usage:

```bash
offdex start --host 0.0.0.0 --port 42420
offdex start --control-plane-url https://control.offdex.app
offdex status
offdex stop
offdex --help
```
