import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { BookOpen, Code2, Download, RefreshCw, Layers } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AdminShell } from "./admin-shell"

const DOCS = [
  { id: "training", label: "Training Manual", file: "TRAINING_MANUAL.md", icon: BookOpen },
  { id: "architecture", label: "Architecture", file: "ARCHITECTURE.md", icon: Layers },
  { id: "api",      label: "API Reference",   file: "API_DOCUMENTATION.md", icon: Code2 },
] as const

type DocId = (typeof DOCS)[number]["id"]

function fileToDocId(href: string): DocId | null {
  const name = href.replace(/^\.\//, "").replace(/^\/docs\//, "")
  const match = DOCS.find((d) => d.file === name)
  return match ? match.id : null
}

function useDoc(file: string) {
  const [text, setText] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(`/docs/${file}?ts=${Date.now()}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.text()
      })
      .then((t) => setText(t))
      .catch((e) => setError(e.message || "Failed to load"))
      .finally(() => setLoading(false))
  }

  useEffect(load, [file])

  return { text, loading, error, reload: load }
}

function DocViewer({ file, onSwitchTab }: { file: string; onSwitchTab: (id: DocId) => void }) {
  const { text, loading, error, reload } = useDoc(file)

  const download = () => {
    const blob = new Blob([text], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = file
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={reload}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Reload
        </Button>
        <Button variant="outline" size="sm" onClick={download} disabled={!text}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Download .md
        </Button>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load {file}: {error}
        </div>
      )}
      {!loading && !error && (
        <article className="prose prose-sm max-w-none rounded-lg border bg-white p-6
                            prose-headings:font-semibold prose-headings:text-[#3D0814]
                            prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                            prose-a:text-[#B91C1C] prose-a:no-underline hover:prose-a:underline
                            prose-code:rounded prose-code:bg-zinc-100 prose-code:px-1.5 prose-code:py-0.5
                            prose-code:text-[#3D0814] prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none
                            prose-pre:rounded-lg prose-pre:bg-zinc-900 prose-pre:text-zinc-100
                            prose-table:text-sm prose-th:bg-zinc-50">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a({ href, children, ...rest }) {
                if (href) {
                  const docId = fileToDocId(href)
                  if (docId) {
                    return (
                      <a
                        href="#"
                        onClick={(e) => { e.preventDefault(); onSwitchTab(docId) }}
                        {...rest}
                      >
                        {children}
                      </a>
                    )
                  }
                }
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
                    {children}
                  </a>
                )
              },
            }}
          >
            {text}
          </ReactMarkdown>
        </article>
      )}
    </div>
  )
}

export function AdminDocs() {
  const [tab, setTab] = useState<DocId>("training")

  return (
    <AdminShell title="Documentation">
      <Card>
        <CardHeader>
          <CardTitle className="text-[#3D0814]">Documentation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Training manual and API reference for the Shaniid RX platform. These render the same
            Markdown shipped under <code>/docs</code> in the repo.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as DocId)}>
            <TabsList>
              {DOCS.map((d) => {
                const Icon = d.icon
                return (
                  <TabsTrigger key={d.id} value={d.id}>
                    <Icon className="mr-1.5 h-4 w-4" />
                    {d.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>
            {DOCS.map((d) => (
              <TabsContent key={d.id} value={d.id} className="mt-4">
                <DocViewer file={d.file} onSwitchTab={setTab} />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </AdminShell>
  )
}

export default AdminDocs
