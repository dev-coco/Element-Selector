// 用于控制功能是否激活的标志
let isActive = false

// 用于存储当前选中的页面元素
let selectedElement = null

// 用于存储当前显示的对话框元素
let currentDialog = null

// 获取对应语言的文本
const lang = str => chrome.i18n.getMessage(str)

// 复制内容
function copy (str) {
  const el = document.createElement('textarea')
  el.value = str
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

// 把 table 元素转换成 表格
function tableToExcel (table) {
  const rows = table.rows
  let excelData = ''

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].cells
    for (let j = 0; j < cells.length; j++) {
      let text = cells[j].innerText
      // 如果有换行需要特殊处理
      if (text.includes('\n')) {
        text = `"${cells[j].innerText.replace(/"/g, '""')}"`
      }
      excelData += text
      if (j < cells.length - 1) {
        excelData += '\t'
      }
    }
    excelData += '\n'
  }
  return excelData
}

// 监听来自 background 或其他脚本的消息
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'activate') {
    // 切换功能激活状态
    isActive = !isActive
    // 根据激活状态改变鼠标光标样式
    document.body.style.cursor = isActive ? 'crosshair' : 'default'
    // 如果功能被禁用且存在对话框，则移除对话框
    if (!isActive && currentDialog) {
      removeDialog()
    }
  }
})

// 监听鼠标悬停事件
document.addEventListener('mouseover', function (e) {
  if (isActive) {
    // 当功能激活时，为悬停的元素添加特定的 CSS 类
    e.target.classList.add('element-hover')
  }
})

// 监听鼠标移出事件
document.addEventListener('mouseout', function (e) {
  if (isActive) {
    // 当功能激活时，从移出的元素移除特定的 CSS 类
    e.target.classList.remove('element-hover')
  }
})

// 监听鼠标点击事件
document.addEventListener('click', function (e) {
  if (isActive) {
    // 阻止默认的点击行为和事件冒泡
    e.preventDefault()
    e.stopPropagation()

    // 如果存在对话框且点击的位置不在对话框内，移除对话框
    if (currentDialog && !currentDialog.contains(e.target)) {
      removeDialog()
    }

    // 如果没有显示对话框，则显示选项对话框
    if (!currentDialog) {
      selectedElement = e.target
      showOptionsDialog(e.clientX, e.clientY)
    }
  } else if (currentDialog && !currentDialog.contains(e.target)) {
    // 在功能未激活时，如果存在对话框且点击位置不在对话框内，也移除对话框
    removeDialog()
  }
})

// 移除对话框的函数
function removeDialog () {
  if (currentDialog) {
    document.body.removeChild(currentDialog)
    currentDialog = null
  }
}

// 显示选项对话框的函数
function showOptionsDialog (x, y) {
  // 移除可能存在的旧对话框
  removeDialog()

  // 创建一个新的对话框元素
  const dialog = document.createElement('div')
  dialog.className = 'options-dialog'
  dialog.style.left = `${x}px`
  dialog.style.top = `${y}px`
  dialog.innerHTML = `
    <select id="contentType">
      <option value="outerText" selected>${lang('text')}</option>
      <option value="outerHTML">${lang('html')}</option>
      <option value="table">table</option>
      <option value="value">value</option>
      <option value="src">src</option>
      <option value="href">href</option>
      <option value="background-image">background image</option>
      <option value="custom">${lang('custom')}</option>
    </select>
    <input type="text" id="customAttr" placeholder="${lang('enterProperty')}" style="display:none;">
    <button id="extract">${lang('extract')}</button>
  `
  document.body.appendChild(dialog)
  currentDialog = dialog

  // 获取选择框和自定义属性输入框及按钮
  const select = dialog.querySelector('#contentType')
  const customInput = dialog.querySelector('#customAttr')
  const extractButton = dialog.querySelector('#extract')

  // 根据选择的内容类型显示或隐藏自定义属性输入框
  select.addEventListener('change', function (e) {
    customInput.style.display = e.target.value === 'custom' ? 'block' : 'none'
  })

  // 处理提取按钮点击事件
  extractButton.addEventListener('click', function (e) {
    e.stopPropagation()
    const option = select.value
    let content
    const noProperty = lang('noProperty')
    // 根据选择的内容类型提取元素的相应属性或内容
    if (option === 'custom') {
      const customAttr = customInput.value
      content = selectedElement[customAttr] || noProperty
    } else {
      switch (option) {
        case 'outerText':
          content = selectedElement.outerText
          break
        case 'outerHTML':
          content = selectedElement.outerHTML
          break
        case 'table':
          content = tableToExcel(selectedElement)
          break
        case 'value':
          content = selectedElement.value || noProperty
          break
        case 'src':
          content = selectedElement.src || noProperty
          break
        case 'href':
          content = selectedElement.href || noProperty
          break
        case 'background-image':
          try {
            content = selectedElement.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/)[1]
          } catch {
            content = noProperty
          }
          break
        default:
          content = lang('needSelectProperty')
      }
    }
    if (content === 'noProperty') {
      alert(noProperty)
      console.log(selectedElement)
    } else {
      copy(content)
      alert(lang('copied'))
      console.log(content)
    }
    // 移除对话框并重置激活状态
    removeDialog()
    isActive = false
    document.body.style.cursor = 'default'
  })

  // 防止点击对话框时触发页面元素选择
  dialog.addEventListener('click', function (e) {
    e.stopPropagation()
  })
}
