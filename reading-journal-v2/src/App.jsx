import React, { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  PenLine,
  Trash2,
  ExternalLink,
  Save,
  X,
  Download,
  Upload,
  Sparkles,
  CalendarDays,
  MessageSquareText,
  Highlighter,
  Columns2,
  ArrowLeft,
  ClipboardPlus,
  Tags,
  Library,
  Shuffle,
  Clock3,
  FileText,
} from "lucide-react";

const STORAGE_KEY = "reading-journal-articles-v3";

const seedArticles = [
  {
    id: "sample-1",
    title: "Why do we dream?",
    source: "BBC Learning English",
    link: "https://www.bbc.co.uk/learningenglish",
    category: "English Learning",
    tags: "dreams, science, speaking",
    status: "Reading",
    difficulty: "Medium",
    date: "2026-05-29",
    articleText:
      "Paste the article text here if you want to keep a copy for practice.\n\nWhen you enter Reading Mode, this article will stay visible on the left side. On the right side, you can write comments, save useful expressions, and collect highlighted sentences.\n\nTry selecting this sentence, then click “Add Selection to Highlights” in Reading Mode.",
    summary:
      "This article discusses possible reasons for dreaming, including memory, emotion, and brain activity during sleep.",
    comments:
      "Useful for speaking practice because the topic is easy to explain but still interesting. I can use it to practice opinion sentences.",
    highlights:
      "Try selecting this sentence, then click “Add Selection to Highlights” in Reading Mode.",
    vocabulary:
      "be related to\nplay a role in\nfrom a psychological perspective\nbrain activity\nmemory consolidation",
  },
  {
    id: "sample-2",
    title: "A short reading note template",
    source: "My Template",
    link: "",
    category: "Daily Reading",
    tags: "routine, summary, vocabulary",
    status: "Saved",
    difficulty: "Easy",
    date: "2026-05-29",
    articleText:
      "Use this page as a reusable structure. Add one article, write a clear summary, then record yourself explaining it.\n\nA good reading session should leave three things behind: a short summary, several useful expressions, and one spoken explanation.",
    summary:
      "The purpose of this website is to help me collect articles and turn reading into speaking practice.",
    comments:
      "After reading, I should explain the article in four sentences: main topic, key point, why it matters, and my opinion.",
    highlights:
      "A good reading session should leave three things behind: a short summary, several useful expressions, and one spoken explanation.",
    vocabulary:
      "The article is mainly about...\nOne important point is...\nThis matters because...\nFrom my perspective...",
  },
];

const emptyArticle = {
  title: "",
  source: "",
  link: "",
  category: "English Learning",
  tags: "",
  status: "Reading",
  difficulty: "Medium",
  date: new Date().toISOString().slice(0, 10),
  articleText: "",
  summary: "",
  comments: "",
  highlights: "",
  vocabulary: "",
};

const categories = [
  "All",
  "English Learning",
  "Finance",
  "Actuarial Science",
  "Technology",
  "News",
  "Daily Reading",
  "Other",
];

const statuses = ["All", "Reading", "Saved", "Finished", "Review Later"];
const editableStatuses = statuses.filter((item) => item !== "All");
const difficulties = ["Easy", "Medium", "Hard"];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadArticles() {
  try {
    const possibleKeys = [
      STORAGE_KEY,
      "reading-journal-articles-v2",
      "reading-journal-articles-v1",
    ];

    for (const key of possibleKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed.map(normalizeArticle) : seedArticles;
      }
    }

    return seedArticles;
  } catch {
    return seedArticles;
  }
}

function normalizeArticle(article) {
  return {
    ...emptyArticle,
    ...article,
    id: article.id || makeId(),
    tags: article.tags || "",
    highlights: article.highlights || "",
  };
}

function normalizeUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `https://${url}`;
}

function splitLines(text) {
  return String(text || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTags(text) {
  return String(text || "")
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWordCount(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getReadingTime(text) {
  const words = getWordCount(text);
  if (!words) return "0 min";
  return `${Math.max(1, Math.ceil(words / 220))} min`;
}

function buildSpeakingPrompt(article) {
  return [
    `The article "${article.title || "this article"}" is mainly about...`,
    "One important point is...",
    "This matters because...",
    "My opinion is...",
  ];
}

export default function App() {
  const [articles, setArticles] = useState(loadArticles);
  const [selectedId, setSelectedId] = useState(() => loadArticles()[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [activeTag, setActiveTag] = useState("All");
  const [view, setView] = useState("journal");
  const [isEditing, setIsEditing] = useState(false);
  const [isReadingMode, setIsReadingMode] = useState(false);
  const [draft, setDraft] = useState(emptyArticle);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  }, [articles]);

  const selectedArticle =
    articles.find((article) => article.id === selectedId) ?? articles[0] ?? null;

  const allTags = useMemo(() => {
    const tagSet = new Set();
    articles.forEach((article) => {
      splitTags(article.tags).forEach((tag) => tagSet.add(tag));
    });
    return ["All", ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];
  }, [articles]);

  const vocabularyBank = useMemo(() => {
    const items = [];
    articles.forEach((article) => {
      splitLines(article.vocabulary).forEach((phrase) => {
        items.push({
          phrase,
          articleId: article.id,
          title: article.title,
          category: article.category,
          tags: article.tags,
          date: article.date,
        });
      });
    });
    return items;
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();

    return articles.filter((article) => {
      const matchesCategory = category === "All" || article.category === category;
      const matchesStatus = statusFilter === "All" || article.status === statusFilter;
      const articleTags = splitTags(article.tags);
      const matchesTag = activeTag === "All" || articleTags.includes(activeTag);
      const searchable = [
        article.title,
        article.source,
        article.category,
        article.tags,
        article.status,
        article.difficulty,
        article.summary,
        article.comments,
        article.highlights,
        article.vocabulary,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        matchesStatus &&
        matchesTag &&
        (!q || searchable.includes(q))
      );
    });
  }, [articles, category, statusFilter, activeTag, query]);

  function startNewArticle() {
    setDraft({ ...emptyArticle, date: new Date().toISOString().slice(0, 10) });
    setIsEditing(true);
    setIsReadingMode(false);
    setView("journal");
  }

  function startEditArticle(article) {
    setDraft({ ...normalizeArticle(article) });
    setIsEditing(true);
    setIsReadingMode(false);
    setView("journal");
  }

  function saveArticle(event) {
    event.preventDefault();

    const isExistingArticle = Boolean(draft.id);

    const cleanArticle = normalizeArticle({
      ...draft,
      id: isExistingArticle ? draft.id : makeId(),
      title: draft.title.trim() || "Untitled Article",
      source: draft.source.trim(),
      link: draft.link.trim(),
      category: draft.category || "Other",
      tags: draft.tags.trim(),
      status: draft.status || "Saved",
      difficulty: draft.difficulty || "Medium",
      date: draft.date || new Date().toISOString().slice(0, 10),
      articleText: draft.articleText.trim(),
      summary: draft.summary.trim(),
      comments: draft.comments.trim(),
      highlights: draft.highlights.trim(),
      vocabulary: draft.vocabulary.trim(),
    });

    if (isExistingArticle) {
      setArticles((current) =>
        current.map((article) =>
          article.id === cleanArticle.id ? cleanArticle : article
        )
      );
    } else {
      setArticles((current) => [cleanArticle, ...current]);
    }

    setSelectedId(cleanArticle.id);
    setIsEditing(false);
  }

  function saveReadingNotes(updatedArticle) {
    const cleanArticle = normalizeArticle(updatedArticle);
    setArticles((current) =>
      current.map((article) => (article.id === cleanArticle.id ? cleanArticle : article))
    );
    setSelectedId(cleanArticle.id);
  }

  function deleteArticle(id) {
    const confirmed = window.confirm("Delete this article?");
    if (!confirmed) return;

    setArticles((current) => {
      const remaining = current.filter((article) => article.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
      return remaining;
    });
    setIsEditing(false);
    setIsReadingMode(false);
  }

  function exportArticles() {
    const file = new Blob([JSON.stringify(articles, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "reading-journal-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function importArticles(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result));
        if (!Array.isArray(imported)) {
          alert("The file is not a valid article list.");
          return;
        }

        const withIds = imported.map(normalizeArticle);
        setArticles(withIds);
        setSelectedId(withIds[0]?.id ?? null);
        setIsEditing(false);
        setIsReadingMode(false);
        setView("journal");
      } catch {
        alert("Could not import this JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function reviewRandomArticle() {
    if (!articles.length) return;
    const randomArticle = articles[Math.floor(Math.random() * articles.length)];
    setSelectedId(randomArticle.id);
    setView("journal");
    setIsEditing(false);
    setIsReadingMode(true);
  }

  function openArticleFromVocabulary(articleId) {
    setSelectedId(articleId);
    setView("journal");
    setIsEditing(false);
    setIsReadingMode(false);
  }

  if (isReadingMode && selectedArticle) {
    return (
      <ReadingMode
        article={selectedArticle}
        onBack={() => setIsReadingMode(false)}
        onSave={saveReadingNotes}
      />
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">
            <Sparkles size={16} />
            Personal English Reading Lab
          </p>
          <h1>Reading Journal</h1>
          <p className="hero__subtitle">
            Save articles, write summaries, collect useful expressions, and turn
            reading into speaking practice.
          </p>
          <div className="hero__actions">
            <button className="primary-button" onClick={startNewArticle}>
              <Plus size={18} />
              Add Article
            </button>
            <button className="ghost-button" onClick={reviewRandomArticle}>
              <Shuffle size={18} />
              Random Review
            </button>
            <button className="ghost-button" onClick={exportArticles}>
              <Download size={18} />
              Export Backup
            </button>
            <label className="ghost-button file-button">
              <Upload size={18} />
              Import
              <input type="file" accept="application/json" onChange={importArticles} />
            </label>
          </div>
        </div>
        <div className="hero__panel">
          <BookOpen size={34} />
          <p className="panel-number">{articles.length}</p>
          <p className="panel-label">saved articles</p>
        </div>
      </section>

      <nav className="view-switcher">
        <button
          className={view === "journal" ? "active" : ""}
          onClick={() => setView("journal")}
        >
          <BookOpen size={18} />
          Journal
        </button>
        <button
          className={view === "vocabulary" ? "active" : ""}
          onClick={() => setView("vocabulary")}
        >
          <Library size={18} />
          Vocabulary Bank
        </button>
      </nav>

      {view === "vocabulary" ? (
        <VocabularyBank
          items={vocabularyBank}
          query={query}
          setQuery={setQuery}
          onOpenArticle={openArticleFromVocabulary}
        />
      ) : (
        <section className="workspace">
          <aside className="sidebar">
            <div className="search-card">
              <div className="search-box">
                <Search size={18} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search title, summary, tags, vocabulary..."
                />
              </div>

              <FilterGroup title="Categories">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </FilterGroup>

              <FilterGroup title="Status">
                {statuses.map((item) => (
                  <button
                    key={item}
                    className={statusFilter === item ? "active" : ""}
                    onClick={() => setStatusFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </FilterGroup>

              <FilterGroup title="Tags">
                {allTags.map((item) => (
                  <button
                    key={item}
                    className={activeTag === item ? "active" : ""}
                    onClick={() => setActiveTag(item)}
                  >
                    {item}
                  </button>
                ))}
              </FilterGroup>
            </div>

            <div className="article-list">
              {filteredArticles.length === 0 ? (
                <div className="empty-state">
                  <p>No article found.</p>
                  <button onClick={startNewArticle}>Add your first one</button>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <button
                    key={article.id}
                    className={`article-card ${
                      selectedArticle?.id === article.id ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedId(article.id);
                      setIsEditing(false);
                      setIsReadingMode(false);
                    }}
                  >
                    <span className="article-card__category">{article.category}</span>
                    <strong>{article.title}</strong>
                    <span className="article-card__summary">
                      {article.summary || "No summary yet."}
                    </span>
                    <span className="article-card__meta">
                      {article.status} · {article.date} ·{" "}
                      {getWordCount(article.articleText)} words
                    </span>
                  </button>
                ))
              )}
            </div>
          </aside>

          <section className="content-card">
            {isEditing ? (
              <ArticleEditor
                draft={draft}
                setDraft={setDraft}
                onSave={saveArticle}
                onCancel={() => setIsEditing(false)}
              />
            ) : selectedArticle ? (
              <ArticleDetail
                article={selectedArticle}
                onRead={() => setIsReadingMode(true)}
                onEdit={() => startEditArticle(selectedArticle)}
                onDelete={() => deleteArticle(selectedArticle.id)}
              />
            ) : (
              <div className="empty-detail">
                <BookOpen size={42} />
                <h2>Your reading desk is empty.</h2>
                <p>Add an article to begin.</p>
                <button className="primary-button" onClick={startNewArticle}>
                  <Plus size={18} />
                  Add Article
                </button>
              </div>
            )}
          </section>
        </section>
      )}
    </main>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="filter-group">
      <p>{title}</p>
      <div className="category-tabs">{children}</div>
    </div>
  );
}

function ArticleEditor({ draft, setDraft, onSave, onCancel }) {
  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <form className="editor" onSubmit={onSave}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Editor</p>
          <h2>{draft.id ? "Edit Article" : "Add New Article"}</h2>
        </div>
        <div className="editor-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            <X size={18} />
            Cancel
          </button>
          <button type="submit" className="primary-button">
            <Save size={18} />
            Save
          </button>
        </div>
      </div>

      <div className="form-grid">
        <label>
          Title
          <input
            value={draft.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Article title"
          />
        </label>

        <label>
          Source
          <input
            value={draft.source}
            onChange={(event) => updateField("source", event.target.value)}
            placeholder="BBC, CBC, The Economist..."
          />
        </label>

        <label>
          Link
          <input
            value={draft.link}
            onChange={(event) => updateField("link", event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label>
          Date
          <input
            type="date"
            value={draft.date}
            onChange={(event) => updateField("date", event.target.value)}
          />
        </label>

        <label>
          Category
          <select
            value={draft.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            {categories
              .filter((item) => item !== "All")
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>
        </label>

        <label>
          Status
          <select
            value={draft.status}
            onChange={(event) => updateField("status", event.target.value)}
          >
            {editableStatuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Difficulty
          <select
            value={draft.difficulty}
            onChange={(event) => updateField("difficulty", event.target.value)}
          >
            {difficulties.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          Tags
          <input
            value={draft.tags}
            onChange={(event) => updateField("tags", event.target.value)}
            placeholder="finance, interview, inflation"
          />
        </label>
      </div>

      <label>
        Article Text / Key Paragraphs
        <textarea
          value={draft.articleText}
          onChange={(event) => updateField("articleText", event.target.value)}
          placeholder="Paste the article text, key paragraph, or your reading notes here."
          rows={7}
        />
      </label>

      <label>
        My Summary
        <textarea
          value={draft.summary}
          onChange={(event) => updateField("summary", event.target.value)}
          placeholder="Write a short summary in your own words."
          rows={5}
        />
      </label>

      <label>
        My Comments / Reflection
        <textarea
          value={draft.comments}
          onChange={(event) => updateField("comments", event.target.value)}
          placeholder="What do you think? Why is it useful? How can you discuss it in English?"
          rows={5}
        />
      </label>

      <label>
        Highlighted Sentences
        <textarea
          value={draft.highlights}
          onChange={(event) => updateField("highlights", event.target.value)}
          placeholder="Paste or save important sentences here."
          rows={5}
        />
      </label>

      <label>
        Useful Vocabulary / Expressions
        <textarea
          value={draft.vocabulary}
          onChange={(event) => updateField("vocabulary", event.target.value)}
          placeholder={"One expression per line:\nplay a key role in\nbe driven by\nfrom my perspective"}
          rows={5}
        />
      </label>
    </form>
  );
}

function ArticleDetail({ article, onRead, onEdit, onDelete }) {
  const vocabList = splitLines(article.vocabulary);
  const highlightList = String(article.highlights || "")
    .split(/\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  const tagList = splitTags(article.tags);

  return (
    <article className="detail">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{article.category}</p>
          <h2>{article.title}</h2>
          <div className="detail-meta">
            <span>
              <CalendarDays size={15} />
              {article.date}
            </span>
            <span>{article.status}</span>
            <span>{article.difficulty}</span>
            <span>
              <FileText size={15} />
              {getWordCount(article.articleText)} words
            </span>
            <span>
              <Clock3 size={15} />
              {getReadingTime(article.articleText)}
            </span>
            {article.source && <span>{article.source}</span>}
          </div>
          {tagList.length > 0 && (
            <div className="tag-row">
              {tagList.map((tag) => (
                <span key={tag}>
                  <Tags size={13} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="editor-actions">
          <button className="primary-button" onClick={onRead}>
            <Columns2 size={18} />
            Reading Mode
          </button>
          {article.link && (
            <a
              className="ghost-button"
              href={normalizeUrl(article.link)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={18} />
              Open
            </a>
          )}
          <button className="ghost-button" onClick={onEdit}>
            <PenLine size={18} />
            Edit
          </button>
          <button className="danger-button" onClick={onDelete}>
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      <InfoBlock title="My Summary" content={article.summary} />
      <InfoBlock title="My Comments" content={article.comments} icon={<MessageSquareText />} />

      {highlightList.length > 0 && (
        <section className="note-block">
          <h3>Highlighted Sentences</h3>
          <ul className="highlight-list">
            {highlightList.map((sentence, index) => (
              <li key={`${sentence}-${index}`}>{sentence}</li>
            ))}
          </ul>
        </section>
      )}

      {vocabList.length > 0 && (
        <section className="note-block">
          <h3>Useful Vocabulary</h3>
          <div className="vocab-list">
            {vocabList.map((word) => (
              <span key={word}>{word}</span>
            ))}
          </div>
        </section>
      )}

      <section className="speaking-card">
        <h3>2-minute speaking prompt</h3>
        <p>
          Record yourself explaining this article. Use these four lines as your
          speaking skeleton:
        </p>
        <ol>
          {buildSpeakingPrompt(article).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      {article.articleText && (
        <section className="article-text">
          <h3>Article Text / Key Paragraphs</h3>
          <p>{article.articleText}</p>
        </section>
      )}
    </article>
  );
}

function VocabularyBank({ items, query, setQuery, onOpenArticle }) {
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) =>
      [item.phrase, item.title, item.category, item.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

  return (
    <section className="vocabulary-page">
      <div className="content-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <Library size={15} />
              Vocabulary Bank
            </p>
            <h2>{items.length} saved expressions</h2>
          </div>
          <div className="search-box vocab-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vocabulary or article title..."
            />
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="empty-detail">
            <Library size={42} />
            <h2>No vocabulary found.</h2>
            <p>Add useful expressions in an article first.</p>
          </div>
        ) : (
          <div className="vocab-bank-grid">
            {filteredItems.map((item, index) => (
              <button
                key={`${item.articleId}-${item.phrase}-${index}`}
                className="vocab-bank-card"
                onClick={() => onOpenArticle(item.articleId)}
              >
                <strong>{item.phrase}</strong>
                <span>{item.title}</span>
                <small>
                  {item.category} · {item.date}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ReadingMode({ article, onBack, onSave }) {
  const [notes, setNotes] = useState(() => normalizeArticle(article));
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    setNotes(normalizeArticle(article));
  }, [article]);

  function updateField(field, value) {
    setNotes((current) => ({ ...current, [field]: value }));
    setSavedMessage("");
  }

  function saveNotes() {
    onSave(notes);
    setSavedMessage("Saved");
    window.setTimeout(() => setSavedMessage(""), 1200);
  }

  function addSelectionToHighlights() {
    const selectedText = String(window.getSelection?.() || "").trim();
    if (!selectedText) {
      alert("Select a sentence from the article first.");
      return;
    }

    setNotes((current) => ({
      ...current,
      highlights: current.highlights
        ? `${current.highlights}\n${selectedText}`
        : selectedText,
    }));
    setSavedMessage("");
    window.getSelection?.().removeAllRanges?.();
  }

  return (
    <main className="reading-shell">
      <header className="reading-topbar">
        <button className="ghost-button" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="reading-title">
          <span>{article.category}</span>
          <strong>{article.title}</strong>
        </div>
        <div className="reading-actions">
          {article.link && (
            <a
              className="ghost-button"
              href={normalizeUrl(article.link)}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={18} />
              Open Original
            </a>
          )}
          <button className="primary-button" onClick={saveNotes}>
            <Save size={18} />
            Save Notes
          </button>
          {savedMessage && <span className="saved-pill">{savedMessage}</span>}
        </div>
      </header>

      <section className="reading-grid">
        <article className="reader-window">
          <div className="reader-window__header">
            <div>
              <p className="eyebrow">Article Window</p>
              <h1>{article.title}</h1>
              <p>
                {article.source || "No source"} · {article.date} ·{" "}
                {getWordCount(article.articleText)} words ·{" "}
                {getReadingTime(article.articleText)} read
              </p>
            </div>
            <button className="ghost-button" onClick={addSelectionToHighlights}>
              <ClipboardPlus size={18} />
              Add Selection to Highlights
            </button>
          </div>

          <div className="article-body">
            {article.articleText ? (
              article.articleText
                .split(/\n{2,}/)
                .map((paragraph, index) => <p key={index}>{paragraph}</p>)
            ) : (
              <div className="empty-reader">
                <BookOpen size={38} />
                <h2>No article text yet.</h2>
                <p>
                  Go back, click Edit, and paste the article text into the Article
                  Text field. Then return to Reading Mode.
                </p>
              </div>
            )}
          </div>
        </article>

        <aside className="notes-window">
          <div className="notes-window__header">
            <p className="eyebrow">
              <Highlighter size={15} />
              Notes Window
            </p>
            <h2>Comments & Highlights</h2>
          </div>

          <label>
            Tags
            <input
              value={notes.tags}
              onChange={(event) => updateField("tags", event.target.value)}
              placeholder="finance, interview, inflation"
            />
          </label>

          <label>
            Highlighted Sentences
            <textarea
              value={notes.highlights}
              onChange={(event) => updateField("highlights", event.target.value)}
              placeholder="Select text from the article and click Add Selection to Highlights, or type important sentences here."
              rows={7}
            />
          </label>

          <label>
            Useful Keywords / Expressions
            <textarea
              value={notes.vocabulary}
              onChange={(event) => updateField("vocabulary", event.target.value)}
              placeholder={"One item per line:\nkey phrase\nuseful sentence\nnew word"}
              rows={7}
            />
          </label>

          <label>
            My Comments
            <textarea
              value={notes.comments}
              onChange={(event) => updateField("comments", event.target.value)}
              placeholder="Write your comments while the article stays visible."
              rows={7}
            />
          </label>

          <label>
            Short Summary
            <textarea
              value={notes.summary}
              onChange={(event) => updateField("summary", event.target.value)}
              placeholder="Summarize the article in 3-5 sentences."
              rows={6}
            />
          </label>

          <section className="mini-speaking-card">
            <h3>Speaking skeleton</h3>
            <ol>
              {buildSpeakingPrompt(article).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </section>
        </aside>
      </section>
    </main>
  );
}

function InfoBlock({ title, content }) {
  return (
    <section className="note-block">
      <h3>{title}</h3>
      <p>{content || "Nothing written yet. Click Edit to add your notes."}</p>
    </section>
  );
}
