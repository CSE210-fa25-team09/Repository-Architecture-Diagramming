import "./App.css"
import reactLogo from "./assets/react.svg"
import viteLogo from "/vite.svg"

function App() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 px-6 text-center text-slate-900">
      <div className="flex flex-wrap items-center justify-center gap-6">
        <a
          href="https://vite.dev"
          target="_blank"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
        >
          <img src={viteLogo} className="h-16 w-16" alt="Vite logo" />
        </a>
        <span className="text-4xl font-light text-slate-400">+</span>
        <a
          href="https://react.dev"
          target="_blank"
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
        >
          <img src={reactLogo} className="h-16 w-16" alt="React logo" />
        </a>
      </div>
      <h1 className="text-pretty text-4xl font-semibold tracking-tight text-slate-800 sm:text-5xl">
        Repository Architecture Diagramming
      </h1>
    </div>
  )
}

export default App
