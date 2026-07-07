import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'

const LANGUAGE_EXTENSIONS = {
  javascript: [javascript()],
  python: [python()],
}

function CodeAnswerEditor({ value, language, onChange }) {
  return (
    <CodeMirror
      value={value}
      height="320px"
      extensions={LANGUAGE_EXTENSIONS[language] || LANGUAGE_EXTENSIONS.javascript}
      onChange={onChange}
    />
  )
}

export default CodeAnswerEditor
