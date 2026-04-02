import type { CSSProperties } from 'react'

export interface CodeEditorProps {
  value?: string
  language?: string
  theme?: 'vs-dark' | 'vs-light'
  onChange?: (value: string | undefined) => void
  readOnly?: boolean
  minimap?: boolean
  lineNumbers?: 'on' | 'off' | 'relative'
  fontSize?: number
  tabSize?: number
  wordWrap?: 'on' | 'off' | 'bounded'
  AIEnabled?: boolean
  APIKey?: string
  AIModel?: string
  height?: string | number
  width?: string | number
  className?: string
  style?: CSSProperties
}

export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const {
    value = '',
    language = 'javascript',
    theme = 'vs-dark',
    onChange,
    readOnly = false,
    fontSize = 14,
    height = '500px',
    width = '100%',
    className,
    style,
  } = props

  const bgColor = theme === 'vs-dark' ? '#1e1e1e' : '#ffffff'
  const textColor = theme === 'vs-dark' ? '#d4d4d4' : '#333333'

  return (
    <textarea
      className={className}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={readOnly}
      style={{
        width,
        height,
        fontSize,
        fontFamily: 'monaco, Menlo, "Ubuntu Mono", Consolas, "Source Code Pro", monospace',
        backgroundColor: bgColor,
        color: textColor,
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '10px',
        resize: 'none',
        outline: 'none',
        lineHeight: 1.5,
        ...style,
      }}
      placeholder={`// ${language} code here...
// Start typing your code`}
    />
  )
}

export interface SimpleCodeEditorProps {
  value?: string
  language?: string
  onChange?: (value: string) => void
  height?: string | number
  width?: string | number
  fontSize?: number
  theme?: 'light' | 'dark'
  readOnly?: boolean
  className?: string
}

export function SimpleCodeEditor({
  value = '',
  language = 'javascript',
  onChange,
  height = '200px',
  width = '100%',
  fontSize = 14,
  theme = 'dark',
  readOnly = false,
  className,
}: SimpleCodeEditorProps) {
  return (
    <CodeEditor
      value={value}
      language={language}
      onChange={(v) => onChange?.(v || '')}
      theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
      height={height}
      width={width}
      fontSize={fontSize}
      readOnly={readOnly}
    />
  )
}

export default CodeEditor