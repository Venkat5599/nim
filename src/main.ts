import { mount } from 'svelte'
import './styles/tokens.css'
import App from './App.svelte'
import { watchVisibility } from './lib/payment'

// Installed before the app mounts so a payment interrupted by the native
// dialog is always reconciled when the webview returns to the foreground.
watchVisibility()

export default mount(App, { target: document.getElementById('app')! })
