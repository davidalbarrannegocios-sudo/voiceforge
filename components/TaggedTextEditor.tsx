'use client'

import { useRef, useCallback, useEffect } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
  isS2: boolean
  placeholder?: string
  disabled?: boolean
}

export function TaggedTextEditor({ value, onChange, isS2, placeholder, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const isComposing = useRef(false)
  const isUpdating = useRef(false)

  function toHTML(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const highlighted = isS2
      ? escaped.replace(/\[([^\]]+)\]/g, '<span class="tts-tag">[$1]</span>')
      : escaped.replace(/\(([^)]+)\)/g, '<span class="tts-tag tts-tag-s1">($1)</span>')
    return highlighted.replace(/\n/g, '<br>')
  }

  function fromHTML(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
  }

  function saveCursor(): number {
    const sel = window.getSelection()
    if (!sel || !editorRef.current || !sel.rangeCount) return 0
    const range = sel.getRangeAt(0)
    const pre = range.cloneRange()
    pre.selectNodeContents(editorRef.current)
    pre.setEnd(range.endContainer, range.endOffset)
    return pre.toString().length
  }

  function restoreCursor(pos: number) {
    const editor = editorRef.current
    if (!editor) return
    const sel = window.getSelection()
    if (!sel) return
    let charCount = 0
    let found = false
    function traverse(node: Node) {
      if (found) return
      if (node.nodeType === Node.TEXT_NODE) {
        const len = node.textContent?.length ?? 0
        if (charCount + len >= pos) {
          const range = document.createRange()
          range.setStart(node, pos - charCount)
          range.collapse(true)
          const selection = window.getSelection()
          if (selection) {
            selection.removeAllRanges()
            selection.addRange(range)
          }
          found = true
        }
        charCount += len
      } else {
        for (const child of Array.from(node.childNodes)) traverse(child)
      }
    }
    traverse(editor)
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || isUpdating.current) return
    const current = fromHTML(editor.innerHTML)
    if (current !== value) {
      const pos = document.activeElement === editor ? saveCursor() : -1
      editor.innerHTML = toHTML(value)
      if (pos >= 0) restoreCursor(pos)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isS2])

  const handleInput = useCallback(() => {
    if (isComposing.current || isUpdating.current) return
    const editor = editorRef.current
    if (!editor) return
    const plain = fromHTML(editor.innerHTML)
    const pos = saveCursor()
    isUpdating.current = true
    onChange(plain)
    editor.innerHTML = toHTML(plain)
    restoreCursor(pos)
    isUpdating.current = false
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, isS2])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      document.execCommand('insertHTML', false, '<br>')
    }
  }, [])

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      suppressContentEditableWarning
      data-tts-editor="true"
      data-placeholder={placeholder ?? 'Escribe o pega tu texto aquí...'}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => { isComposing.current = true }}
      onCompositionEnd={() => { isComposing.current = false; handleInput() }}
      style={{
        position: 'absolute',
        inset: 0,
        padding: '16px',
        fontSize: '14px',
        lineHeight: '1.75',
        fontFamily: 'inherit',
        color: 'rgba(255,255,255,0.92)',
        caretColor: 'white',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        resize: 'none',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxSizing: 'border-box',
        opacity: disabled ? 0.6 : 1,
      }}
    />
  )
}
