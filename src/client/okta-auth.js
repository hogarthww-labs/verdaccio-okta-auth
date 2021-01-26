import { interruptClick, parseQueryParams, retry } from './lib'
import usageInfo from './useage'

const helpCardUsageInfoSelector = '#help-card .MuiCardContent-root span'
const dialogUsageInfoSelector = '#registryInfo--dialog-container .MuiDialogContent-root .MuiTypography-root span'
const randomClass = 'Os1waV6BSoZQKfFwNlIwS'

function copyToClipboard(text) {
  const node = document.createElement('div')
  node.innerText = text
  document.body.appendChild(node)
  const range = document.createRange()
  const selection = window.getSelection()
  range.selectNodeContents(node)
  selection.removeAllRanges()
  selection.addRange(range)
  document.execCommand('copy')
  document.body.removeChild(node)
}

function init(options) {
  const { loginButton, logoutButton, updateUsageInfo } = options

  interruptClick(loginButton, () => {
    location.href = '/-/authorization-code/callback'
  })

  interruptClick(logoutButton, () => {
    localStorage.removeItem('username')
    localStorage.removeItem('token')
    localStorage.removeItem('npm')
  })

  document.addEventListener('click', () => retry(updateUsageInfo))
  retry(updateUsageInfo)
}
function modifyUsageInfoNodes(selector, findPredicate) {
  const infoElements = document.querySelectorAll(selector)
  const firstUsageInfoEl = Array.prototype.find.call(infoElements, findPredicate)
  const hasInjectedElement = !!Array.prototype.find.call(infoElements, node =>
    node.parentElement.classList.contains(randomClass),
  )

  const loggedIn = localStorage.getItem('username') !== undefined
  console.log(localStorage)
  if (!firstUsageInfoEl || hasInjectedElement) {
    return
  }

  const cachedParent = firstUsageInfoEl && firstUsageInfoEl.parentElement
  if (cachedParent) {
    usageInfo()
      .split('\n')
      .reverse()
      .forEach(info => {
        const clonedNode = cachedParent.cloneNode(true)
        const textElem = clonedNode.querySelector('span')
        const copyEl = clonedNode.querySelector('button')

        clonedNode.classList.add(randomClass)
        textElem.innerText = info
        copyEl.style.visibility = loggedIn ? 'visible' : 'hidden'
        copyEl.onclick = e => {
          e.preventDefault()
          e.stopPropagation()
          copyToClipboard(info)
        }

        cachedParent.insertAdjacentElement('afterend', clonedNode)
      })
  }

  infoElements.forEach(node => {
    if (
      // We only match lines related to bundler commands
      !!node.innerText.match(/^(npm|pnpm|yarn)/) &&
      // And only commands that we want to remove
      (node.innerText.includes('adduser') || node.innerText.includes('set password'))
    ) {
      node.parentElement.parentElement.removeChild(node.parentElement)
    }
  })
}

function updateUsageInfo() {
  modifyUsageInfoNodes(helpCardUsageInfoSelector, node => node.innerText.includes('adduser'))
  modifyUsageInfoNodes(
    dialogUsageInfoSelector,
    node =>
      !!node.innerText.match(
        // This checks for an element showing instructions to set the registry URL
        /((npm|pnpm) set|(yarn) config set)/,
      ),
  )
}

init({
  loginButton: "[data-testid='header--button-login']",
  logoutButton: "#header--button-logout, [data-testid='header--button-logout']",
  updateUsageInfo,
})

export default init
