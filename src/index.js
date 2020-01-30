import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'

import './wasm_exec'

const fetchedWasmBuf = fetch("main.wasm").then(res => res.arrayBuffer())

const runWasm = async (args) => {
  const go = new Go()
  const wasmBuf = await fetchedWasmBuf
  const { instance } = await WebAssembly.instantiate(wasmBuf, go.importObject)
  go.argv = ['js', ...args]
  go.run(instance)
}

const CLI_NAME = 'my-cli'
const PS = `\x1B[1;3;34m${CLI_NAME}\x1B[0m > `
const PS_LENGTH = CLI_NAME.length + 3
const NEWLINE = '\r\n'

const term = new Terminal({
  theme: {
    background: '#20252C',
    cyan: '#5DADF1',
  }
})
const fitAddon = new FitAddon()
term.loadAddon(fitAddon)
term.open(document.getElementById('terminal'))
fitAddon.fit()
term.textarea.focus()
term.write(PS)

window.addEventListener('resize', () => {
  fitAddon.fit()
})

const decoder = new TextDecoder()
let inputBuf = []
let outputBuf = ''

// Overwrite wasm_exec.js
fs.writeSync = (fd, buf) => {
  outputBuf += decoder.decode(buf)
  const nl = outputBuf.lastIndexOf("\n")
  outputBuf.substr(0, nl).split('\n').filter(s => s).forEach(line => {
    term.writeln(line)
  })
  outputBuf = outputBuf.substr(nl + 1)
  return buf.length
}

const isPrintable = e => !e.altKey && !e.altGraphKey && !e.ctrlKey && !e.metaKey

term.onKey(async ({ key, domEvent: e }) => {
  if (e.key === 'Enter') {
    term.write(NEWLINE)
    if (inputBuf.length > 0) {
      const input = inputBuf.join('')
      inputBuf = []
      await runWasm(input.split(' '))
    }
    term.write(PS)
  } else if (e.key === 'Backspace') {
      // Do not delete the prompt
    if (term._core.buffer.x > PS_LENGTH) {
      term.write('\b \b')
    }
  } else if (isPrintable(e)) {
    term.write(key)
    inputBuf.push(key)
  }
})
