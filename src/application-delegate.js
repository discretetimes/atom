const {ipcRenderer, remote, shell} = require('electron')
const ipcHelpers = require('./ipc-helpers')
const {Disposable} = require('event-kit')
const getWindowLoadSettings = require('./get-window-load-settings')

module.exports =
class ApplicationDelegate {
  getWindowLoadSettings () { return getWindowLoadSettings() }

  open (params) {
    return ipcRenderer.send('open', params)
  }

  pickFolder (callback) {
    const responseChannel = 'atom-pick-folder-response'
    ipcRenderer.on(responseChannel, function (event, path) {
      ipcRenderer.removeAllListeners(responseChannel)
      return callback(path)
    })
    return ipcRenderer.send('pick-folder', responseChannel)
  }

  getCurrentWindow () {
    return remote.getCurrentWindow()
  }

  closeWindow () {
    return ipcHelpers.call('window-method', 'close')
  }

  async getTemporaryWindowState () {
    const stateJSON = await ipcHelpers.call('get-temporary-window-state')
    return JSON.parse(stateJSON)
  }

  setTemporaryWindowState (state) {
    return ipcHelpers.call('set-temporary-window-state', JSON.stringify(state))
  }

  getWindowSize () {
    const [width, height] = Array.from(remote.getCurrentWindow().getSize())
    return {width, height}
  }

  setWindowSize (width, height) {
    return ipcHelpers.call('set-window-size', width, height)
  }

  getWindowPosition () {
    const [x, y] = Array.from(remote.getCurrentWindow().getPosition())
    return {x, y}
  }

  setWindowPosition (x, y) {
    return ipcHelpers.call('set-window-position', x, y)
  }

  centerWindow () {
    return ipcHelpers.call('center-window')
  }

  focusWindow () {
    return ipcHelpers.call('focus-window')
  }

  showWindow () {
    return ipcHelpers.call('show-window')
  }

  hideWindow () {
    return ipcHelpers.call('hide-window')
  }

  reloadWindow () {
    return ipcHelpers.call('window-method', 'reload')
  }

  restartApplication () {
    return ipcRenderer.send('restart-application')
  }

  minimizeWindow () {
    return ipcHelpers.call('window-method', 'minimize')
  }

  isWindowMaximized () {
    return remote.getCurrentWindow().isMaximized()
  }

  maximizeWindow () {
    return ipcHelpers.call('window-method', 'maximize')
  }

  unmaximizeWindow () {
    return ipcHelpers.call('window-method', 'unmaximize')
  }

  isWindowFullScreen () {
    return remote.getCurrentWindow().isFullScreen()
  }

  setWindowFullScreen (fullScreen = false) {
    return ipcHelpers.call('window-method', 'setFullScreen', fullScreen)
  }

  onDidEnterFullScreen (callback) {
    return ipcHelpers.on(ipcRenderer, 'did-enter-full-screen', callback)
  }

  onDidLeaveFullScreen (callback) {
    return ipcHelpers.on(ipcRenderer, 'did-leave-full-screen', callback)
  }

  async openWindowDevTools () {
    // Defer DevTools interaction to the next tick, because using them during
    // event handling causes some wrong input events to be triggered on
    // `TextEditorComponent` (Ref.: https://github.com/atom/atom/issues/9697).
    await new Promise(process.nextTick)
    return ipcHelpers.call('window-method', 'openDevTools')
  }

  async closeWindowDevTools () {
    // Defer DevTools interaction to the next tick, because using them during
    // event handling causes some wrong input events to be triggered on
    // `TextEditorComponent` (Ref.: https://github.com/atom/atom/issues/9697).
    await new Promise(process.nextTick)
    return ipcHelpers.call('window-method', 'closeDevTools')
  }

  async toggleWindowDevTools () {
    // Defer DevTools interaction to the next tick, because using them during
    // event handling causes some wrong input events to be triggered on
    // `TextEditorComponent` (Ref.: https://github.com/atom/atom/issues/9697).
    await new Promise(process.nextTick)
    return ipcHelpers.call('window-method', 'toggleDevTools')
  }

  executeJavaScriptInWindowDevTools (code) {
    return ipcRenderer.send('execute-javascript-in-dev-tools', code)
  }

  didClosePathWithWaitSession (path) {
    return ipcHelpers.call('window-method', 'didClosePathWithWaitSession', path)
  }

  setWindowDocumentEdited (edited) {
    return ipcHelpers.call('window-method', 'setDocumentEdited', edited)
  }

  setRepresentedFilename (filename) {
    return ipcHelpers.call('window-method', 'setRepresentedFilename', filename)
  }

  addRecentDocument (filename) {
    return ipcRenderer.send('add-recent-document', filename)
  }

  setRepresentedDirectoryPaths (paths) {
    return ipcHelpers.call('window-method', 'setRepresentedDirectoryPaths', paths)
  }

  setAutoHideWindowMenuBar (autoHide) {
    return ipcHelpers.call('window-method', 'setAutoHideMenuBar', autoHide)
  }

  setWindowMenuBarVisibility (visible) {
    return remote.getCurrentWindow().setMenuBarVisibility(visible)
  }

  getPrimaryDisplayWorkAreaSize () {
    return remote.screen.getPrimaryDisplay().workAreaSize
  }

  getUserDefault (key, type) {
    return remote.systemPreferences.getUserDefault(key, type)
  }

  confirm ({message, detailedMessage, buttons}) {
    let buttonLabels
    if (!buttons) buttons = {}
    if (Array.isArray(buttons)) {
      buttonLabels = buttons
    } else {
      buttonLabels = Object.keys(buttons)
    }

    const chosen = remote.dialog.showMessageBox(remote.getCurrentWindow(), {
      type: 'info',
      message,
      detail: detailedMessage,
      buttons: buttonLabels,
      normalizeAccessKeys: true
    })

    if (Array.isArray(buttons)) {
      return chosen
    } else {
      const callback = buttons[buttonLabels[chosen]]
      return (typeof callback === 'function' ? callback() : undefined)
    }
  }

  showMessageDialog (params) {}

  showSaveDialog (params) {
    if (typeof params === 'string') {
      params = {defaultPath: params}
    }
    return this.getCurrentWindow().showSaveDialog(params)
  }

  playBeepSound () {
    return shell.beep()
  }

  onDidOpenLocations (callback) {
    const outerCallback = (event, message, detail) => {
      if (message === 'open-locations') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onUpdateAvailable (callback) {
    const outerCallback = (event, message, detail) => {
      // TODO: Yes, this is strange that `onUpdateAvailable` is listening for
      // `did-begin-downloading-update`. We currently have no mechanism to know
      // if there is an update, so begin of downloading is a good proxy.
      if (message === 'did-begin-downloading-update') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onDidBeginDownloadingUpdate (callback) {
    return this.onUpdateAvailable(callback)
  }

  onDidBeginCheckingForUpdate (callback) {
    const outerCallback = (event, message, detail) => {
      if (message === 'checking-for-update') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onDidCompleteDownloadingUpdate (callback) {
    const outerCallback = (event, message, detail) => {
      // TODO: We could rename this event to `did-complete-downloading-update`
      if (message === 'update-available') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onUpdateNotAvailable (callback) {
    const outerCallback = (event, message, detail) => {
      if (message === 'update-not-available') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onUpdateError (callback) {
    const outerCallback = (event, message, detail) => {
      if (message === 'update-error') callback(detail)
    }

    ipcRenderer.on('message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('message', outerCallback))
  }

  onApplicationMenuCommand (handler) {
    const outerCallback = (event, ...args) => handler(...args)

    ipcRenderer.on('command', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('command', outerCallback))
  }

  onContextMenuCommand (handler) {
    const outerCallback = (event, ...args) => handler(...args)

    ipcRenderer.on('context-command', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('context-command', outerCallback))
  }

  onURIMessage (handler) {
    const outerCallback = (event, ...args) => handler(...args)

    ipcRenderer.on('uri-message', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('uri-message', outerCallback))
  }

  onDidRequestUnload (callback) {
    const outerCallback = async (event, message) => {
      const shouldUnload = await callback(event)
      ipcRenderer.send('did-prepare-to-unload', shouldUnload)
    }

    ipcRenderer.on('prepare-to-unload', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('prepare-to-unload', outerCallback))
  }

  onDidChangeHistoryManager (callback) {
    const outerCallback = (event, message) => callback(event)

    ipcRenderer.on('did-change-history-manager', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('did-change-history-manager', outerCallback))
  }

  didChangeHistoryManager () {
    return ipcRenderer.send('did-change-history-manager')
  }

  openExternal (url) {
    return shell.openExternal(url)
  }

  checkForUpdate () {
    return ipcRenderer.send('command', 'application:check-for-update')
  }

  restartAndInstallUpdate () {
    return ipcRenderer.send('command', 'application:install-update')
  }

  getAutoUpdateManagerState () {
    return ipcRenderer.sendSync('get-auto-update-manager-state')
  }

  getAutoUpdateManagerErrorMessage () {
    return ipcRenderer.sendSync('get-auto-update-manager-error')
  }

  emitWillSavePath (path) {
    return ipcRenderer.sendSync('will-save-path', path)
  }

  emitDidSavePath (path) {
    return ipcRenderer.sendSync('did-save-path', path)
  }

  resolveProxy (requestId, url) {
    return ipcRenderer.send('resolve-proxy', requestId, url)
  }

  onDidResolveProxy (callback) {
    const outerCallback = (event, requestId, proxy) => callback(requestId, proxy)

    ipcRenderer.on('did-resolve-proxy', outerCallback)
    return new Disposable(() => ipcRenderer.removeListener('did-resolve-proxy', outerCallback))
  }
}
