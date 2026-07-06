import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookMarked,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  ClipboardPlus,
  Clock3,
  Columns2,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Flame,
  Goal,
  GraduationCap,
  Highlighter,
  Import,
  Library,
  ListChecks,
  MessageSquareText,
  PenLine,
  Plus,
  Save,
  Search,
  Shuffle,
  Sparkles,
  Tags,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import { STORAGE_KEYS, downloadJson, loadArray, makeId, saveArray } from "./storage.js";
import {
  addDays,
  average,
  clamp,
  currentStreak,
  endOfWeek,
  formatDate,
  formatShortDate,
  getReadingTime,
  getWordCount,
  inDateRange,
  lastNWeeks,
  normalizeUrl,
  number,
  pagesInSession,
  parseLocalDate,
  percentChange,
  splitLines,
  splitTags,
  startOfWeek,
  toIsoDate,
  todayIso,
  truncate,
} from "./utils.js";

const ARTICLE_CATEGORIES = [
  "All",
  "History",
  "Science and Technology",
  "International Relations",
  "My Major",
  "Finance Industry",
  "News",
  "Nature",
  "Other",
];
const ARTICLE_STATUSES = ["All", "Reading", "Finished", "Starred"];
const BOOK_STATUSES = ["Planning", "Reading", "Paused", "Completed", "Abandoned"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const FAMILIARITY_LEVELS = ["New", "Recognizable", "Active"];
const GOAL_METRICS = [
  ["sessions", "Reading sessions"],
  ["minutes", "Reading minutes"],
  ["pages", "Pages read"],
  ["vocabulary", "Vocabulary added"],
  ["tests", "Progress tests"],
];

const emptyArticle = {
  title: "",
  source: "",
  link: "",
  category: "Other",
  tags: "",
  status: "Reading",
  difficulty: "Medium",
  date: todayIso(),
  articleText: "",
  summary: "",
  comments: "",
  highlights: "",
  vocabulary: "",
};

const emptyBook = {
  title: "",
  author: "",
  category: "History",
  totalPages: "",
  currentPage: "",
  status: "Planning",
  startDate: "",
  targetDate: "",
  notes: "",
};

const emptySession = {
  date: todayIso(),
  bookId: "",
  articleId: "",
  startPage: "",
  endPage: "",
  minutes: "",
  unknownWords: "",
  lookedUpWords: "",
  comprehension: "3",
  difficulty: "3",
  summary: "",
  notes: "",
};

const emptyVocabulary = {
  word: "",
  meaning: "",
  sourceSentence: "",
  ownSentence: "",
  category: "General",
  familiarity: "New",
  bookId: "",
  articleId: "",
  createdAt: todayIso(),
  lastReviewedAt: "",
};

const emptyTest = {
  date: todayIso(),
  title: "",
  sourceType: "Book",
  sourceId: "",
  wordCount: "",
  minutes: "",
  unknownWords: "",
  comprehension: "3",
  summaryScore: "3",
  notes: "",
};

const emptyGoal = {
  label: "",
  period: "Weekly",
  metric: "minutes",
  target: "150",
  startDate: toIsoDate(startOfWeek(new Date())),
  endDate: toIsoDate(endOfWeek(new Date())),
};

const emptyReview = {
  weekStart: toIsoDate(startOfWeek(new Date())),
  easier: "",
  challenge: "",
  achievement: "",
  nextFocus: "",
};

function normalizeArticle(article) {
  return {
    ...emptyArticle,
    ...article,
    id: article?.id || makeId("article"),
    category: article?.category === "English Learning" ? "Other" : article?.category || "Other",
    status: article?.status === "starred" ? "Starred" : article?.status || "Reading",
    tags: article?.tags || "",
    highlights: article?.highlights || "",
    vocabulary: article?.vocabulary || "",
  };
}

function normalizeBook(book) {
  return { ...emptyBook, ...book, id: book?.id || makeId("book") };
}
function normalizeSession(session) {
  return { ...emptySession, ...session, id: session?.id || makeId("session") };
}
function normalizeVocabulary(item) {
  return { ...emptyVocabulary, ...item, id: item?.id || makeId("word") };
}
function normalizeTest(test) {
  return { ...emptyTest, ...test, id: test?.id || makeId("test") };
}
function normalizeGoal(goal) {
  return { ...emptyGoal, ...goal, id: goal?.id || makeId("goal") };
}
function normalizeReview(review) {
  return { ...emptyReview, ...review, id: review?.id || makeId("review") };
}

function loadArticles() {
  const possibleKeys = [
    STORAGE_KEYS.articles,
    "reading-journal-articles-v2",
    "reading-journal-articles-v1",
  ];
  for (const key of possibleKeys) {
    const value = loadArray(key, null);
    if (Array.isArray(value)) return value.map(normalizeArticle);
  }
  return [];
}

export default function App() {
  const [articles, setArticles] = useState(loadArticles);
  const [books, setBooks] = useState(() => loadArray(STORAGE_KEYS.books).map(normalizeBook));
  const [sessions, setSessions] = useState(() => loadArray(STORAGE_KEYS.sessions).map(normalizeSession));
  const [vocabulary, setVocabulary] = useState(() =>
    loadArray(STORAGE_KEYS.vocabulary).map(normalizeVocabulary),
  );
  const [tests, setTests] = useState(() => loadArray(STORAGE_KEYS.tests).map(normalizeTest));
  const [goals, setGoals] = useState(() => loadArray(STORAGE_KEYS.goals).map(normalizeGoal));
  const [reviews, setReviews] = useState(() => loadArray(STORAGE_KEYS.reviews).map(normalizeReview));
  const [view, setView] = useState("dashboard");
  const [readingArticleId, setReadingArticleId] = useState(null);
  const importRef = useRef(null);

  useEffect(() => saveArray(STORAGE_KEYS.articles, articles), [articles]);
  useEffect(() => saveArray(STORAGE_KEYS.books, books), [books]);
  useEffect(() => saveArray(STORAGE_KEYS.sessions, sessions), [sessions]);
  useEffect(() => saveArray(STORAGE_KEYS.vocabulary, vocabulary), [vocabulary]);
  useEffect(() => saveArray(STORAGE_KEYS.tests, tests), [tests]);
  useEffect(() => saveArray(STORAGE_KEYS.goals, goals), [goals]);
  useEffect(() => saveArray(STORAGE_KEYS.reviews, reviews), [reviews]);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEYS.migration)) return;
    const existing = new Set(
      vocabulary.map((item) => `${item.articleId || ""}::${item.word.toLowerCase()}`),
    );
    const migrated = [];
    articles.forEach((article) => {
      splitLines(article.vocabulary).forEach((word) => {
        const key = `${article.id}::${word.toLowerCase()}`;
        if (!existing.has(key)) {
          existing.add(key);
          migrated.push(
            normalizeVocabulary({
              word,
              category: article.category || "General",
              familiarity: "New",
              articleId: article.id,
              createdAt: article.date || todayIso(),
            }),
          );
        }
      });
    });
    if (migrated.length) setVocabulary((current) => [...migrated, ...current]);
    localStorage.setItem(STORAGE_KEYS.migration, "complete");
  }, [articles, vocabulary]);

  const readingArticle = articles.find((article) => article.id === readingArticleId);
  if (readingArticle) {
    return (
      <ReadingMode
        article={readingArticle}
        onBack={() => setReadingArticleId(null)}
        onSave={(updated) => {
          setArticles((current) =>
            current.map((article) =>
              article.id === updated.id ? normalizeArticle(updated) : article,
            ),
          );
        }}
      />
    );
  }

  function exportBackup() {
    downloadJson(`english-reading-journal-backup-${todayIso()}.json`, {
      version: 4,
      exportedAt: new Date().toISOString(),
      articles,
      books,
      sessions,
      vocabulary,
      tests,
      goals,
      reviews,
    });
  }

  function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          setArticles(parsed.map(normalizeArticle));
          alert("Old article backup imported. Your newer tracking data was kept.");
        } else if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.articles)) setArticles(parsed.articles.map(normalizeArticle));
          if (Array.isArray(parsed.books)) setBooks(parsed.books.map(normalizeBook));
          if (Array.isArray(parsed.sessions)) setSessions(parsed.sessions.map(normalizeSession));
          if (Array.isArray(parsed.vocabulary)) {
            setVocabulary(parsed.vocabulary.map(normalizeVocabulary));
          }
          if (Array.isArray(parsed.tests)) setTests(parsed.tests.map(normalizeTest));
          if (Array.isArray(parsed.goals)) setGoals(parsed.goals.map(normalizeGoal));
          if (Array.isArray(parsed.reviews)) setReviews(parsed.reviews.map(normalizeReview));
          alert("Full reading journal backup imported.");
        } else {
          throw new Error("Unsupported backup format");
        }
      } catch (error) {
        console.error(error);
        alert("This file is not a valid reading journal backup.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  const navItems = [
    ["dashboard", "Dashboard", BarChart3],
    ["books", "Books", BookMarked],
    ["sessions", "Daily Log", Clock3],
    ["articles", "Articles", BookOpen],
    ["vocabulary", "Vocabulary", Library],
    ["tests", "Progress Tests", GraduationCap],
    ["goals", "Goals", Target],
    ["reviews", "Weekly Review", ClipboardCheck],
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView("dashboard")}> 
          <span className="brand-mark"><BookOpen size={22} /></span>
          <span><strong>Reading Journal</strong><small>English training dashboard</small></span>
        </button>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={exportBackup}><Download size={17} /> Export</button>
          <button className="ghost-button" onClick={() => importRef.current?.click()}><Upload size={17} /> Import</button>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={importBackup} />
        </div>
      </header>

      <section className="hero compact-hero">
        <div>
          <p className="eyebrow"><Sparkles size={15} /> Personal English Reading Lab</p>
          <h1>Make quiet progress visible.</h1>
          <p>Track the work today, then compare the evidence week by week.</p>
        </div>
        <div className="hero-mini-stats">
          <MiniStat icon={<Flame />} value={currentStreak(sessions)} label="day streak" />
          <MiniStat icon={<BookMarked />} value={books.filter((book) => book.status === "Reading").length} label="active books" />
          <MiniStat icon={<Library />} value={vocabulary.length} label="saved words" />
        </div>
      </section>

      <nav className="main-nav" aria-label="Reading journal sections">
        {navItems.map(([id, label, Icon]) => (
          <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
            <Icon size={17} /> {label}
          </button>
        ))}
      </nav>

      <section className="page-stage">
        {view === "dashboard" && (
          <Dashboard
            books={books}
            sessions={sessions}
            vocabulary={vocabulary}
            tests={tests}
            goals={goals}
            onNavigate={setView}
          />
        )}
        {view === "books" && <BooksPage books={books} setBooks={setBooks} sessions={sessions} />}
        {view === "sessions" && (
          <SessionsPage
            books={books}
            articles={articles}
            sessions={sessions}
            setSessions={setSessions}
            setBooks={setBooks}
          />
        )}
        {view === "articles" && (
          <ArticlesPage
            articles={articles}
            setArticles={setArticles}
            onRead={setReadingArticleId}
          />
        )}
        {view === "vocabulary" && (
          <VocabularyPage
            vocabulary={vocabulary}
            setVocabulary={setVocabulary}
            books={books}
            articles={articles}
          />
        )}
        {view === "tests" && (
          <TestsPage tests={tests} setTests={setTests} books={books} articles={articles} />
        )}
        {view === "goals" && (
          <GoalsPage
            goals={goals}
            setGoals={setGoals}
            sessions={sessions}
            vocabulary={vocabulary}
            tests={tests}
          />
        )}
        {view === "reviews" && <ReviewsPage reviews={reviews} setReviews={setReviews} sessions={sessions} />}
      </section>
    </main>
  );
}

function MiniStat({ icon, value, label }) {
  return <div className="mini-stat"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>;
}

function Dashboard({ books, sessions, vocabulary, tests, goals, onNavigate }) {
  const now = new Date();
  const currentStart = startOfWeek(now);
  const currentEnd = endOfWeek(now);
  const previousStart = addDays(currentStart, -7);
  const previousEnd = addDays(currentEnd, -7);
  const currentSessions = sessions.filter((session) => inDateRange(session.date, currentStart, currentEnd));
  const previousSessions = sessions.filter((session) => inDateRange(session.date, previousStart, previousEnd));

  const totals = summarizeSessions(currentSessions);
  const previousTotals = summarizeSessions(previousSessions);
  const activeBook = books.find((book) => book.status === "Reading");
  const activeGoals = goals.filter((goal) => {
    const today = parseLocalDate(todayIso());
    return today >= parseLocalDate(goal.startDate) && today <= parseLocalDate(goal.endDate);
  });
  const weeks = lastNWeeks(8).map((week) => {
    const weekly = sessions.filter((session) => inDateRange(session.date, week.start, week.end));
    return { label: week.label, ...summarizeSessions(weekly) };
  });
  const sessionPoints = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((session) => ({
      label: formatShortDate(session.date),
      comprehension: number(session.comprehension),
      density: pagesInSession(session)
        ? (number(session.unknownWords) / pagesInSession(session)) * 10
        : 0,
    }));

  return (
    <div className="stack gap-lg">
      <section className="section-heading">
        <div><p className="eyebrow">This week</p><h2>Your progress cockpit</h2><p className="muted">{formatDate(toIsoDate(currentStart))} to {formatDate(toIsoDate(currentEnd))}</p></div>
        <button className="primary-button" onClick={() => onNavigate("sessions")}><Plus size={17} /> Log today&apos;s reading</button>
      </section>

      <section className="metric-grid">
        <MetricCard icon={<Flame />} label="Current streak" value={`${currentStreak(sessions)} days`} sub="Consistency, not perfection" />
        <MetricCard icon={<Clock3 />} label="Minutes this week" value={totals.minutes} change={percentChange(totals.minutes, previousTotals.minutes)} />
        <MetricCard icon={<BookOpen />} label="Pages this week" value={totals.pages} change={percentChange(totals.pages, previousTotals.pages)} />
        <MetricCard icon={<Activity />} label="Comprehension" value={totals.comprehension ? `${totals.comprehension.toFixed(1)}/5` : "No data"} sub={`${currentSessions.length} session${currentSessions.length === 1 ? "" : "s"}`} />
        <MetricCard icon={<TrendingUp />} label="Reading speed" value={totals.speed ? `${totals.speed.toFixed(0)} pages/hr` : "No data"} sub="Use only for similar books" />
        <MetricCard icon={<TrendingDown />} label="Unknown words" value={totals.density ? `${totals.density.toFixed(1)} / 10 pages` : "No data"} sub="A lower trend is encouraging" />
      </section>

      <section className="dashboard-grid">
        <div className="panel chart-panel wide-panel">
          <PanelTitle eyebrow="Eight-week view" title="Minutes and pages" />
          <WeeklyBars data={weeks} />
        </div>
        <div className="panel">
          <PanelTitle eyebrow="Current book" title={activeBook?.title || "No active book"} />
          {activeBook ? <BookProgress book={activeBook} /> : <EmptySmall text="Mark a book as Reading to show it here." />}
          <button className="text-button" onClick={() => onNavigate("books")}>Open book library <ChevronRight size={15} /></button>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="panel chart-panel">
          <PanelTitle eyebrow="Session trend" title="Comprehension" />
          <LineChart data={sessionPoints} dataKey="comprehension" max={5} empty="Log sessions to start this chart." />
        </div>
        <div className="panel chart-panel">
          <PanelTitle eyebrow="Vocabulary pressure" title="Unknown words per 10 pages" />
          <LineChart data={sessionPoints} dataKey="density" empty="Add page and unknown-word counts to see the trend." />
        </div>
      </section>

      <section className="dashboard-grid three-columns">
        <div className="panel">
          <PanelTitle eyebrow="Vocabulary" title={`${vocabulary.length} saved items`} />
          <FamiliarityBars vocabulary={vocabulary} />
          <button className="text-button" onClick={() => onNavigate("vocabulary")}>Review vocabulary <ChevronRight size={15} /></button>
        </div>
        <div className="panel">
          <PanelTitle eyebrow="Goals" title={`${activeGoals.length} active`} />
          {activeGoals.length ? activeGoals.slice(0, 3).map((goal) => (
            <GoalProgress key={goal.id} goal={goal} sessions={sessions} vocabulary={vocabulary} tests={tests} />
          )) : <EmptySmall text="Create one small, controllable goal for this week." />}
          <button className="text-button" onClick={() => onNavigate("goals")}>Manage goals <ChevronRight size={15} /></button>
        </div>
        <div className="panel">
          <PanelTitle eyebrow="Progress tests" title={`${tests.length} completed`} />
          {tests.length ? (
            <div className="test-snapshot">
              <strong>{tests[0].title || "Latest test"}</strong>
              <span>{formatDate(tests[0].date)}</span>
              <p>{number(tests[0].comprehension)}/5 comprehension · {number(tests[0].unknownWords)} unknown words</p>
            </div>
          ) : <EmptySmall text="A short test every two weeks makes progress easier to see." />}
          <button className="text-button" onClick={() => onNavigate("tests")}>Open progress tests <ChevronRight size={15} /></button>
        </div>
      </section>
    </div>
  );
}

function summarizeSessions(items) {
  const pages = items.reduce((sum, session) => sum + pagesInSession(session), 0);
  const minutes = items.reduce((sum, session) => sum + number(session.minutes), 0);
  const unknownWords = items.reduce((sum, session) => sum + number(session.unknownWords), 0);
  return {
    pages,
    minutes,
    unknownWords,
    comprehension: average(items.map((session) => session.comprehension).filter(Boolean)),
    speed: minutes ? (pages / minutes) * 60 : 0,
    density: pages ? (unknownWords / pages) * 10 : 0,
  };
}

function MetricCard({ icon, label, value, change, sub }) {
  const hasChange = Number.isFinite(change) && change !== 0;
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {hasChange ? <small className={change > 0 ? "positive" : "negative"}>{change > 0 ? "+" : ""}{change.toFixed(0)}% vs last week</small> : <small>{sub || "No change from last week"}</small>}
    </article>
  );
}

function PanelTitle({ eyebrow, title }) {
  return <div className="panel-title"><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>;
}

function WeeklyBars({ data }) {
  const maximum = Math.max(1, ...data.map((item) => item.minutes));
  return (
    <div className="weekly-chart" role="img" aria-label="Eight week reading chart">
      {data.map((item) => (
        <div className="weekly-column" key={item.label} title={`${item.minutes} minutes, ${item.pages} pages`}>
          <div className="bar-stack">
            <span className="bar minutes-bar" style={{ height: `${Math.max(3, (item.minutes / maximum) * 100)}%` }} />
          </div>
          <strong>{item.minutes}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, dataKey, max, empty }) {
  if (!data.length) return <EmptySmall text={empty} />;
  const values = data.map((item) => number(item[dataKey]));
  const upper = max || Math.max(1, ...values);
  const points = values.map((value, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 92 - (clamp(value, 0, upper) / upper) * 82;
    return `${x},${y}`;
  }).join(" ");
  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" x2="100" y1="92" y2="92" className="axis-line" />
        <polyline points={points} className="chart-line" />
        {values.map((value, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return <circle key={`${x}-${y}`} cx={x} cy={y} r="1.8" className="chart-dot"><title>{data[index].label}: {value.toFixed(1)}</title></circle>;
        })}
      </svg>
      <div className="line-labels">{data.map((item, index) => <small key={`${item.label}-${index}`}>{index % 2 === 0 || data.length < 7 ? item.label : ""}</small>)}</div>
    </div>
  );
}

function BookProgress({ book }) {
  const total = Math.max(0, number(book.totalPages));
  const current = clamp(number(book.currentPage), 0, total || number(book.currentPage));
  const progress = total ? (current / total) * 100 : 0;
  return (
    <div className="book-progress">
      <p>{book.author || "Author not added"}</p>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <div><strong>{current} / {total || "?"} pages</strong><span>{progress.toFixed(0)}%</span></div>
      {book.targetDate && <small>Target: {formatDate(book.targetDate)}</small>}
    </div>
  );
}

function FamiliarityBars({ vocabulary }) {
  const total = Math.max(1, vocabulary.length);
  return (
    <div className="familiarity-list">
      {FAMILIARITY_LEVELS.map((level) => {
        const count = vocabulary.filter((item) => item.familiarity === level).length;
        return <div key={level}><span><strong>{level}</strong><small>{count}</small></span><div className="progress-track"><i style={{ width: `${(count / total) * 100}%` }} /></div></div>;
      })}
    </div>
  );
}

function EmptySmall({ text }) {
  return <div className="empty-small"><p>{text}</p></div>;
}

function BooksPage({ books, setBooks, sessions }) {
  const [draft, setDraft] = useState(emptyBook);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const filtered = books.filter((book) => statusFilter === "All" || book.status === statusFilter);

  function submit(event) {
    event.preventDefault();
    const cleaned = normalizeBook({
      ...draft,
      id: editingId || makeId("book"),
      title: draft.title.trim() || "Untitled Book",
      author: draft.author.trim(),
      totalPages: number(draft.totalPages),
      currentPage: number(draft.currentPage),
    });
    setBooks((current) => editingId ? current.map((book) => book.id === editingId ? cleaned : book) : [cleaned, ...current]);
    setDraft(emptyBook);
    setEditingId(null);
  }

  return (
    <div className="split-layout">
      <section className="panel sticky-panel">
        <PanelTitle eyebrow={editingId ? "Edit book" : "Book library"} title={editingId ? "Update details" : "Add a book"} />
        <form className="form-stack" onSubmit={submit}>
          <Field label="Title"><input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Author"><input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} /></Field>
          <div className="two-column-form">
            <Field label="Category"><select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{ARTICLE_CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></Field>
            <Field label="Status"><select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>{BOOK_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
          </div>
          <div className="two-column-form">
            <Field label="Total pages"><input type="number" min="0" value={draft.totalPages} onChange={(e) => setDraft({ ...draft, totalPages: e.target.value })} /></Field>
            <Field label="Current page"><input type="number" min="0" value={draft.currentPage} onChange={(e) => setDraft({ ...draft, currentPage: e.target.value })} /></Field>
          </div>
          <div className="two-column-form">
            <Field label="Start date"><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></Field>
            <Field label="Target date"><input type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} /></Field>
          </div>
          <Field label="Notes"><textarea rows="4" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
          <div className="form-actions">
            {editingId && <button type="button" className="ghost-button" onClick={() => { setDraft(emptyBook); setEditingId(null); }}><X size={16} /> Cancel</button>}
            <button className="primary-button"><Save size={16} /> {editingId ? "Save changes" : "Add book"}</button>
          </div>
        </form>
      </section>

      <section className="stack">
        <div className="section-heading"><div><p className="eyebrow">Library</p><h2>{books.length} books</h2></div><div className="chip-row">{["All", ...BOOK_STATUSES].map((item) => <button key={item} className={statusFilter === item ? "active" : ""} onClick={() => setStatusFilter(item)}>{item}</button>)}</div></div>
        {filtered.length ? <div className="book-grid">{filtered.map((book) => {
          const bookSessions = sessions.filter((session) => session.bookId === book.id);
          return <article className="book-card" key={book.id}>
            <div className="book-card-top"><span className="status-pill">{book.status}</span><span>{book.category}</span></div>
            <h3>{book.title}</h3><p>{book.author || "Author not added"}</p>
            <BookProgress book={book} />
            <div className="card-meta"><span>{bookSessions.length} sessions</span><span>{book.startDate ? `Started ${formatShortDate(book.startDate)}` : "Not started"}</span></div>
            {book.notes && <p className="card-note">{truncate(book.notes, 150)}</p>}
            <div className="card-actions"><button className="ghost-button" onClick={() => { setDraft({ ...book }); setEditingId(book.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit3 size={15} /> Edit</button><button className="danger-button" onClick={() => { if (window.confirm(`Delete ${book.title}? Reading sessions will remain in the log.`)) setBooks((current) => current.filter((item) => item.id !== book.id)); }}><Trash2 size={15} /> Delete</button></div>
          </article>;
        })}</div> : <EmptyPage icon={<BookMarked />} title="No books in this view" text="Add your first book or change the status filter." />}
      </section>
    </div>
  );
}

function SessionsPage({ books, articles, sessions, setSessions, setBooks }) {
  const [draft, setDraft] = useState({ ...emptySession, bookId: books.find((book) => book.status === "Reading")?.id || "" });
  const [editingId, setEditingId] = useState(null);
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  function submit(event) {
    event.preventDefault();
    const cleaned = normalizeSession({ ...draft, id: editingId || makeId("session") });
    setSessions((current) => editingId ? current.map((item) => item.id === editingId ? cleaned : item) : [cleaned, ...current]);
    if (cleaned.bookId && number(cleaned.endPage)) {
      setBooks((current) => current.map((book) => book.id === cleaned.bookId && number(cleaned.endPage) > number(book.currentPage) ? { ...book, currentPage: number(cleaned.endPage), status: book.status === "Planning" ? "Reading" : book.status } : book));
    }
    setDraft({ ...emptySession, bookId: cleaned.bookId });
    setEditingId(null);
  }

  return (
    <div className="split-layout">
      <section className="panel sticky-panel">
        <PanelTitle eyebrow="Daily reading log" title={editingId ? "Edit session" : "Record a session"} />
        <form className="form-stack" onSubmit={submit}>
          <Field label="Date"><input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
          <Field label="Book"><select value={draft.bookId} onChange={(e) => setDraft({ ...draft, bookId: e.target.value, articleId: "" })}><option value="">No book / general reading</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></Field>
          <Field label="Article"><select value={draft.articleId} onChange={(e) => setDraft({ ...draft, articleId: e.target.value, bookId: "" })}><option value="">No saved article</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></Field>
          <div className="three-column-form">
            <Field label="Start page"><input type="number" min="0" value={draft.startPage} onChange={(e) => setDraft({ ...draft, startPage: e.target.value })} /></Field>
            <Field label="End page"><input type="number" min="0" value={draft.endPage} onChange={(e) => setDraft({ ...draft, endPage: e.target.value })} /></Field>
            <Field label="Minutes"><input type="number" min="1" required value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} /></Field>
          </div>
          <div className="two-column-form">
            <Field label="Unknown words"><input type="number" min="0" value={draft.unknownWords} onChange={(e) => setDraft({ ...draft, unknownWords: e.target.value })} /></Field>
            <Field label="Words looked up"><input type="number" min="0" value={draft.lookedUpWords} onChange={(e) => setDraft({ ...draft, lookedUpWords: e.target.value })} /></Field>
          </div>
          <div className="two-column-form">
            <Field label="Comprehension (1–5)"><RatingInput value={draft.comprehension} onChange={(value) => setDraft({ ...draft, comprehension: value })} /></Field>
            <Field label="Difficulty (1–5)"><RatingInput value={draft.difficulty} onChange={(value) => setDraft({ ...draft, difficulty: value })} /></Field>
          </div>
          <Field label="Three-sentence summary"><textarea rows="4" value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="What happened or what argument did the author make?" /></Field>
          <Field label="Notes"><textarea rows="3" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="What felt easier or harder today?" /></Field>
          <div className="form-actions">{editingId && <button type="button" className="ghost-button" onClick={() => { setDraft(emptySession); setEditingId(null); }}><X size={16} /> Cancel</button>}<button className="primary-button"><Save size={16} /> Save session</button></div>
        </form>
      </section>
      <section className="stack">
        <div className="section-heading"><div><p className="eyebrow">History</p><h2>{sessions.length} reading sessions</h2></div></div>
        {sorted.length ? <div className="timeline">{sorted.map((session) => {
          const book = books.find((item) => item.id === session.bookId);
          const article = articles.find((item) => item.id === session.articleId);
          const pages = pagesInSession(session);
          const speed = number(session.minutes) && pages ? pages / number(session.minutes) * 60 : 0;
          return <article className="timeline-card" key={session.id}>
            <div className="timeline-date"><strong>{formatShortDate(session.date)}</strong><span>{parseLocalDate(session.date).toLocaleDateString("en-US", { weekday: "short" })}</span></div>
            <div className="timeline-content"><div className="timeline-title"><div><h3>{book?.title || article?.title || "General reading"}</h3><p>{pages ? `${pages} pages` : "Pages not tracked"} · {number(session.minutes)} minutes {speed ? `· ${speed.toFixed(0)} pages/hr` : ""}</p></div><span className="score-pill">{session.comprehension}/5 understood</span></div>
            <div className="session-stat-row"><span>{number(session.unknownWords)} unknown words</span><span>{number(session.lookedUpWords)} looked up</span><span>Difficulty {session.difficulty}/5</span></div>
            {session.summary && <p className="session-summary">{session.summary}</p>}{session.notes && <p className="card-note">{session.notes}</p>}
            <div className="card-actions"><button className="ghost-button" onClick={() => { setDraft({ ...session }); setEditingId(session.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit3 size={15} /> Edit</button><button className="danger-button" onClick={() => { if (window.confirm("Delete this reading session?")) setSessions((current) => current.filter((item) => item.id !== session.id)); }}><Trash2 size={15} /> Delete</button></div></div>
          </article>;
        })}</div> : <EmptyPage icon={<Clock3 />} title="No reading sessions yet" text="Your first entry will immediately begin the progress charts." />}
      </section>
    </div>
  );
}

function RatingInput({ value, onChange }) {
  return <div className="rating-input">{[1, 2, 3, 4, 5].map((rating) => <button type="button" key={rating} className={number(value) === rating ? "active" : ""} onClick={() => onChange(String(rating))}>{rating}</button>)}</div>;
}

function VocabularyPage({ vocabulary, setVocabulary, books, articles }) {
  const [draft, setDraft] = useState(emptyVocabulary);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("All");
  const filtered = vocabulary.filter((item) => {
    const searchable = [item.word, item.meaning, item.sourceSentence, item.ownSentence, item.category].join(" ").toLowerCase();
    return (level === "All" || item.familiarity === level) && (!query.trim() || searchable.includes(query.toLowerCase()));
  });

  function submit(event) {
    event.preventDefault();
    const cleaned = normalizeVocabulary({ ...draft, id: editingId || makeId("word"), word: draft.word.trim(), meaning: draft.meaning.trim() });
    setVocabulary((current) => editingId ? current.map((item) => item.id === editingId ? cleaned : item) : [cleaned, ...current]);
    setDraft(emptyVocabulary); setEditingId(null);
  }

  return (
    <div className="split-layout">
      <section className="panel sticky-panel"><PanelTitle eyebrow="Vocabulary tracker" title={editingId ? "Edit an entry" : "Add useful language"} />
        <form className="form-stack" onSubmit={submit}>
          <Field label="Word or expression"><input required value={draft.word} onChange={(e) => setDraft({ ...draft, word: e.target.value })} /></Field>
          <Field label="Simple English meaning"><textarea rows="3" value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} /></Field>
          <Field label="Sentence from the book"><textarea rows="3" value={draft.sourceSentence} onChange={(e) => setDraft({ ...draft, sourceSentence: e.target.value })} /></Field>
          <Field label="My own sentence"><textarea rows="3" value={draft.ownSentence} onChange={(e) => setDraft({ ...draft, ownSentence: e.target.value })} /></Field>
          <div className="two-column-form"><Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field><Field label="Familiarity"><select value={draft.familiarity} onChange={(e) => setDraft({ ...draft, familiarity: e.target.value })}>{FAMILIARITY_LEVELS.map((item) => <option key={item}>{item}</option>)}</select></Field></div>
          <Field label="Book"><select value={draft.bookId} onChange={(e) => setDraft({ ...draft, bookId: e.target.value })}><option value="">No linked book</option>{books.map((book) => <option key={book.id} value={book.id}>{book.title}</option>)}</select></Field>
          <Field label="Article"><select value={draft.articleId} onChange={(e) => setDraft({ ...draft, articleId: e.target.value })}><option value="">No linked article</option>{articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}</select></Field>
          <div className="form-actions">{editingId && <button type="button" className="ghost-button" onClick={() => { setDraft(emptyVocabulary); setEditingId(null); }}><X size={16} /> Cancel</button>}<button className="primary-button"><Save size={16} /> Save vocabulary</button></div>
        </form>
      </section>
      <section className="stack"><div className="section-heading"><div><p className="eyebrow">Vocabulary bank</p><h2>{vocabulary.length} entries</h2></div><div className="search-and-chips"><div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search words and meanings" /></div><div className="chip-row">{["All", ...FAMILIARITY_LEVELS].map((item) => <button key={item} className={level === item ? "active" : ""} onClick={() => setLevel(item)}>{item}</button>)}</div></div></div>
        <FamiliarityBars vocabulary={vocabulary} />
        {filtered.length ? <div className="vocabulary-grid">{filtered.map((item) => {
          const source = books.find((book) => book.id === item.bookId)?.title || articles.find((article) => article.id === item.articleId)?.title;
          return <article className="vocab-card" key={item.id}><div className="vocab-card-top"><span className={`level-badge level-${item.familiarity.toLowerCase()}`}>{item.familiarity}</span><span>{item.category}</span></div><h3>{item.word}</h3>{item.meaning && <p>{item.meaning}</p>}{item.sourceSentence && <blockquote>{item.sourceSentence}</blockquote>}{item.ownSentence && <p className="own-sentence"><strong>My sentence:</strong> {item.ownSentence}</p>}<div className="card-meta"><span>{source || "No source linked"}</span><span>Added {formatShortDate(item.createdAt)}</span></div><div className="vocab-actions"><select aria-label="Change familiarity" value={item.familiarity} onChange={(e) => setVocabulary((current) => current.map((entry) => entry.id === item.id ? { ...entry, familiarity: e.target.value, lastReviewedAt: todayIso() } : entry))}>{FAMILIARITY_LEVELS.map((entry) => <option key={entry}>{entry}</option>)}</select><button className="ghost-button" onClick={() => { setDraft({ ...item }); setEditingId(item.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit3 size={15} /> Edit</button><button className="danger-button icon-button" aria-label="Delete vocabulary" onClick={() => setVocabulary((current) => current.filter((entry) => entry.id !== item.id))}><Trash2 size={15} /></button></div></article>;
        })}</div> : <EmptyPage icon={<Library />} title="No vocabulary found" text="Add a useful word or change the filters." />}
      </section>
    </div>
  );
}

function TestsPage({ tests, setTests, books, articles }) {
  const [draft, setDraft] = useState(emptyTest);
  const [editingId, setEditingId] = useState(null);
  const sorted = [...tests].sort((a, b) => b.date.localeCompare(a.date));

  function submit(event) {
    event.preventDefault();
    const cleaned = normalizeTest({ ...draft, id: editingId || makeId("test") });
    setTests((current) => editingId ? current.map((item) => item.id === editingId ? cleaned : item) : [cleaned, ...current]);
    setDraft(emptyTest); setEditingId(null);
  }

  const chronological = [...tests].sort((a, b) => a.date.localeCompare(b.date)).map((test) => ({ label: formatShortDate(test.date), comprehension: number(test.comprehension), unknown: number(test.unknownWords), pace: number(test.minutes) && number(test.wordCount) ? number(test.wordCount) / number(test.minutes) : 0 }));
  return (
    <div className="stack gap-lg">
      <section className="dashboard-grid three-columns"><div className="panel chart-panel"><PanelTitle eyebrow="Test trend" title="Comprehension" /><LineChart data={chronological} dataKey="comprehension" max={5} empty="Complete the first test to begin." /></div><div className="panel chart-panel"><PanelTitle eyebrow="Test trend" title="Unknown words" /><LineChart data={chronological} dataKey="unknown" empty="Complete the first test to begin." /></div><div className="panel chart-panel"><PanelTitle eyebrow="Test trend" title="Words per minute" /><LineChart data={chronological} dataKey="pace" empty="Add word count and minutes to calculate pace." /></div></section>
      <div className="split-layout"><section className="panel sticky-panel"><PanelTitle eyebrow="Progress test" title={editingId ? "Edit test" : "Add a comparison point"} /><form className="form-stack" onSubmit={submit}>
        <Field label="Date"><input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field><Field label="Test title"><input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="One-page history passage" /></Field>
        <div className="two-column-form"><Field label="Source type"><select value={draft.sourceType} onChange={(e) => setDraft({ ...draft, sourceType: e.target.value, sourceId: "" })}><option>Book</option><option>Article</option><option>Other</option></select></Field><Field label="Linked source"><select value={draft.sourceId} onChange={(e) => setDraft({ ...draft, sourceId: e.target.value })}><option value="">No source linked</option>{draft.sourceType === "Book" && books.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}{draft.sourceType === "Article" && articles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field></div>
        <div className="three-column-form"><Field label="Word count"><input type="number" min="0" value={draft.wordCount} onChange={(e) => setDraft({ ...draft, wordCount: e.target.value })} /></Field><Field label="Minutes"><input type="number" min="0" step="0.1" value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} /></Field><Field label="Unknown words"><input type="number" min="0" value={draft.unknownWords} onChange={(e) => setDraft({ ...draft, unknownWords: e.target.value })} /></Field></div>
        <div className="two-column-form"><Field label="Comprehension (1–5)"><RatingInput value={draft.comprehension} onChange={(value) => setDraft({ ...draft, comprehension: value })} /></Field><Field label="Summary quality (1–5)"><RatingInput value={draft.summaryScore} onChange={(value) => setDraft({ ...draft, summaryScore: value })} /></Field></div>
        <Field label="Notes"><textarea rows="5" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="What required rereading? What felt easier than last time?" /></Field><div className="form-actions">{editingId && <button type="button" className="ghost-button" onClick={() => { setDraft(emptyTest); setEditingId(null); }}><X size={16} /> Cancel</button>}<button className="primary-button"><Save size={16} /> Save test</button></div>
      </form></section>
      <section className="stack"><div className="section-heading"><div><p className="eyebrow">Comparison history</p><h2>{tests.length} tests</h2></div></div>{sorted.length ? sorted.map((test, index) => { const previous = sorted[index + 1]; const pace = number(test.minutes) ? number(test.wordCount) / number(test.minutes) : 0; return <article className="test-card" key={test.id}><div className="test-card-head"><div><span>{formatDate(test.date)}</span><h3>{test.title}</h3></div><span className="score-pill">{test.comprehension}/5 understood</span></div><div className="test-metrics"><span><strong>{test.unknownWords || 0}</strong> unknown</span><span><strong>{test.minutes || 0}</strong> minutes</span><span><strong>{pace ? pace.toFixed(0) : "—"}</strong> words/min</span><span><strong>{test.summaryScore}/5</strong> summary</span></div>{previous && <p className="comparison-note">Compared with the previous test: {number(test.unknownWords) <= number(previous.unknownWords) ? "fewer or equal unknown words" : "more unknown words"}, and {number(test.comprehension) >= number(previous.comprehension) ? "equal or stronger comprehension" : "lower comprehension"}.</p>}{test.notes && <p className="card-note">{test.notes}</p>}<div className="card-actions"><button className="ghost-button" onClick={() => { setDraft({ ...test }); setEditingId(test.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit3 size={15} /> Edit</button><button className="danger-button" onClick={() => setTests((current) => current.filter((item) => item.id !== test.id))}><Trash2 size={15} /> Delete</button></div></article>; }) : <EmptyPage icon={<GraduationCap />} title="No progress tests yet" text="Use a similar-length passage every two weeks and record the result here." />}</section></div>
    </div>
  );
}

function GoalsPage({ goals, setGoals, sessions, vocabulary, tests }) {
  const [draft, setDraft] = useState(emptyGoal);
  const [editingId, setEditingId] = useState(null);
  function updatePeriod(period) {
    const start = period === "Weekly" ? startOfWeek(new Date()) : new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    const end = period === "Weekly" ? endOfWeek(start) : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 12);
    setDraft((current) => ({ ...current, period, startDate: toIsoDate(start), endDate: toIsoDate(end) }));
  }
  function submit(event) {
    event.preventDefault();
    const cleaned = normalizeGoal({ ...draft, id: editingId || makeId("goal"), label: draft.label.trim() || GOAL_METRICS.find(([key]) => key === draft.metric)?.[1] || "Reading goal" });
    setGoals((current) => editingId ? current.map((item) => item.id === editingId ? cleaned : item) : [cleaned, ...current]);
    setDraft(emptyGoal); setEditingId(null);
  }
  return <div className="split-layout"><section className="panel sticky-panel"><PanelTitle eyebrow="Goal system" title={editingId ? "Edit goal" : "Create an action goal"} /><form className="form-stack" onSubmit={submit}><Field label="Goal label"><input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Read four times this week" /></Field><div className="two-column-form"><Field label="Period"><select value={draft.period} onChange={(e) => updatePeriod(e.target.value)}><option>Weekly</option><option>Monthly</option></select></Field><Field label="Measure"><select value={draft.metric} onChange={(e) => setDraft({ ...draft, metric: e.target.value })}>{GOAL_METRICS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field></div><Field label="Target"><input type="number" min="1" required value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} /></Field><div className="two-column-form"><Field label="Start date"><input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></Field><Field label="End date"><input type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></Field></div><div className="form-actions">{editingId && <button type="button" className="ghost-button" onClick={() => { setDraft(emptyGoal); setEditingId(null); }}><X size={16} /> Cancel</button>}<button className="primary-button"><Save size={16} /> Save goal</button></div></form></section><section className="stack"><div className="section-heading"><div><p className="eyebrow">Goals</p><h2>{goals.length} tracked goals</h2></div></div>{goals.length ? <div className="goal-grid">{goals.map((goal) => <article className="goal-card" key={goal.id}><div className="goal-card-head"><div className="metric-icon"><Goal /></div><div><span>{goal.period}</span><h3>{goal.label}</h3></div></div><GoalProgress goal={goal} sessions={sessions} vocabulary={vocabulary} tests={tests} detailed /><div className="card-meta"><span>{formatDate(goal.startDate)} to {formatDate(goal.endDate)}</span></div><div className="card-actions"><button className="ghost-button" onClick={() => { setDraft({ ...goal }); setEditingId(goal.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Edit3 size={15} /> Edit</button><button className="danger-button" onClick={() => setGoals((current) => current.filter((item) => item.id !== goal.id))}><Trash2 size={15} /> Delete</button></div></article>)}</div> : <EmptyPage icon={<Target />} title="No goals yet" text="Start with one weekly goal based on an action you control." />}</section></div>;
}

function goalValue(goal, sessions, vocabulary, tests) {
  const start = parseLocalDate(goal.startDate); const end = parseLocalDate(goal.endDate);
  const scopedSessions = sessions.filter((session) => inDateRange(session.date, start, end));
  if (goal.metric === "sessions") return scopedSessions.length;
  if (goal.metric === "minutes") return scopedSessions.reduce((sum, item) => sum + number(item.minutes), 0);
  if (goal.metric === "pages") return scopedSessions.reduce((sum, item) => sum + pagesInSession(item), 0);
  if (goal.metric === "vocabulary") return vocabulary.filter((item) => inDateRange(item.createdAt, start, end)).length;
  if (goal.metric === "tests") return tests.filter((item) => inDateRange(item.date, start, end)).length;
  return 0;
}

function GoalProgress({ goal, sessions, vocabulary, tests, detailed = false }) {
  const value = goalValue(goal, sessions, vocabulary, tests);
  const target = Math.max(1, number(goal.target)); const progress = clamp(value / target * 100, 0, 100);
  return <div className={`goal-progress ${detailed ? "detailed" : ""}`}><div><span>{value} of {target}</span><strong>{progress.toFixed(0)}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }} /></div>{progress >= 100 && <small className="positive"><Check size={14} /> Goal completed</small>}</div>;
}

function ReviewsPage({ reviews, setReviews, sessions }) {
  const currentWeek = toIsoDate(startOfWeek(new Date()));
  const existing = reviews.find((review) => review.weekStart === currentWeek);
  const [draft, setDraft] = useState(existing ? { ...existing } : emptyReview);
  useEffect(() => { const match = reviews.find((review) => review.weekStart === draft.weekStart); if (match) setDraft({ ...match }); else setDraft((current) => ({ ...emptyReview, weekStart: current.weekStart })); }, [draft.weekStart, reviews]);
  function submit(event) { event.preventDefault(); const old = reviews.find((review) => review.weekStart === draft.weekStart); const cleaned = normalizeReview({ ...draft, id: old?.id || draft.id || makeId("review") }); setReviews((current) => old ? current.map((item) => item.id === old.id ? cleaned : item) : [cleaned, ...current]); alert("Weekly review saved."); }
  const weekStartDate = parseLocalDate(draft.weekStart); const weekSessions = sessions.filter((session) => inDateRange(session.date, weekStartDate, endOfWeek(weekStartDate))); const totals = summarizeSessions(weekSessions);
  return <div className="split-layout"><section className="panel sticky-panel"><PanelTitle eyebrow="Weekly reflection" title="Notice what changed" /><form className="form-stack" onSubmit={submit}><Field label="Week beginning"><input type="date" value={draft.weekStart} onChange={(e) => setDraft({ ...draft, weekStart: toIsoDate(startOfWeek(parseLocalDate(e.target.value))) })} /></Field><div className="review-summary"><span><strong>{weekSessions.length}</strong> sessions</span><span><strong>{totals.minutes}</strong> minutes</span><span><strong>{totals.pages}</strong> pages</span><span><strong>{totals.comprehension ? totals.comprehension.toFixed(1) : "—"}</strong> comprehension</span></div><Field label="What became easier?"><textarea rows="4" value={draft.easier} onChange={(e) => setDraft({ ...draft, easier: e.target.value })} /></Field><Field label="What was still difficult?"><textarea rows="4" value={draft.challenge} onChange={(e) => setDraft({ ...draft, challenge: e.target.value })} /></Field><Field label="One achievement"><textarea rows="3" value={draft.achievement} onChange={(e) => setDraft({ ...draft, achievement: e.target.value })} /></Field><Field label="Focus for next week"><textarea rows="3" value={draft.nextFocus} onChange={(e) => setDraft({ ...draft, nextFocus: e.target.value })} /></Field><button className="primary-button"><Save size={16} /> Save weekly review</button></form></section><section className="stack"><div className="section-heading"><div><p className="eyebrow">Review archive</p><h2>{reviews.length} weekly reflections</h2></div></div>{reviews.length ? [...reviews].sort((a, b) => b.weekStart.localeCompare(a.weekStart)).map((review) => <article className="review-card" key={review.id}><span>Week of {formatDate(review.weekStart)}</span><h3>{review.achievement || "Weekly reflection"}</h3>{review.easier && <p><strong>Easier:</strong> {review.easier}</p>}{review.challenge && <p><strong>Challenge:</strong> {review.challenge}</p>}{review.nextFocus && <p><strong>Next focus:</strong> {review.nextFocus}</p>}<button className="danger-button" onClick={() => setReviews((current) => current.filter((item) => item.id !== review.id))}><Trash2 size={15} /> Delete</button></article>) : <EmptyPage icon={<ClipboardCheck />} title="No weekly reviews yet" text="Your first review can be only three or four sentences." />}</section></div>;
}

function ArticlesPage({ articles, setArticles, onRead }) {
  const [selectedId, setSelectedId] = useState(articles[0]?.id || null);
  const [draft, setDraft] = useState(emptyArticle);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const selected = articles.find((article) => article.id === selectedId) || articles[0];
  const filtered = articles.filter((article) => {
    const searchable = [article.title, article.source, article.tags, article.summary, article.vocabulary].join(" ").toLowerCase();
    return (category === "All" || article.category === category) && (status === "All" || article.status === status) && (!query.trim() || searchable.includes(query.toLowerCase()));
  });
  function save(event) { event.preventDefault(); const existing = Boolean(draft.id); const cleaned = normalizeArticle({ ...draft, id: draft.id || makeId("article"), title: draft.title.trim() || "Untitled Article" }); setArticles((current) => existing ? current.map((article) => article.id === cleaned.id ? cleaned : article) : [cleaned, ...current]); setSelectedId(cleaned.id); setEditing(false); }
  function randomReview() { if (!articles.length) return; const article = articles[Math.floor(Math.random() * articles.length)]; onRead(article.id); }
  return <div className="stack"><div className="section-heading"><div><p className="eyebrow">Original journal</p><h2>Saved articles and reading notes</h2></div><div className="form-actions"><button className="ghost-button" onClick={randomReview}><Shuffle size={16} /> Random review</button><button className="primary-button" onClick={() => { setDraft({ ...emptyArticle, date: todayIso() }); setEditing(true); }}><Plus size={16} /> Add article</button></div></div><div className="article-workspace"><aside className="article-sidebar"><div className="search-box"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search articles" /></div><Field label="Category"><select value={category} onChange={(e) => setCategory(e.target.value)}>{ARTICLE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status"><select value={status} onChange={(e) => setStatus(e.target.value)}>{ARTICLE_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field><div className="article-list">{filtered.map((article) => <button key={article.id} className={`article-list-card ${selected?.id === article.id ? "selected" : ""}`} onClick={() => { setSelectedId(article.id); setEditing(false); }}><span>{article.category}</span><strong>{article.title}</strong><small>{article.status} · {article.date}</small><p>{truncate(article.summary || "No summary yet.", 85)}</p></button>)}</div></aside><section className="panel article-content">{editing ? <ArticleEditor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setEditing(false)} /> : selected ? <ArticleDetail article={selected} onRead={() => onRead(selected.id)} onEdit={() => { setDraft({ ...selected }); setEditing(true); }} onDelete={() => { if (window.confirm("Delete this article?")) { const remaining = articles.filter((item) => item.id !== selected.id); setArticles(remaining); setSelectedId(remaining[0]?.id || null); } }} /> : <EmptyPage icon={<BookOpen />} title="Your article desk is empty" text="Add an article, excerpt, or reading note." />}</section></div></div>;
}

function ArticleEditor({ draft, setDraft, onSave, onCancel }) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  return <form className="form-stack" onSubmit={onSave}><div className="section-heading"><div><p className="eyebrow">Article editor</p><h2>{draft.id ? "Edit article" : "Add article"}</h2></div><button type="button" className="ghost-button" onClick={onCancel}><X size={16} /> Cancel</button></div><div className="two-column-form"><Field label="Title"><input required value={draft.title} onChange={(e) => update("title", e.target.value)} /></Field><Field label="Source"><input value={draft.source} onChange={(e) => update("source", e.target.value)} /></Field></div><div className="two-column-form"><Field label="Link"><input value={draft.link} onChange={(e) => update("link", e.target.value)} placeholder="https://" /></Field><Field label="Date"><input type="date" value={draft.date} onChange={(e) => update("date", e.target.value)} /></Field></div><div className="four-column-form"><Field label="Category"><select value={draft.category} onChange={(e) => update("category", e.target.value)}>{ARTICLE_CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Status"><select value={draft.status} onChange={(e) => update("status", e.target.value)}>{ARTICLE_STATUSES.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Difficulty"><select value={draft.difficulty} onChange={(e) => update("difficulty", e.target.value)}>{DIFFICULTIES.map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Tags"><input value={draft.tags} onChange={(e) => update("tags", e.target.value)} /></Field></div><Field label="Article text / key paragraphs"><textarea rows="10" value={draft.articleText} onChange={(e) => update("articleText", e.target.value)} /></Field><Field label="My summary"><textarea rows="5" value={draft.summary} onChange={(e) => update("summary", e.target.value)} /></Field><Field label="My comments"><textarea rows="5" value={draft.comments} onChange={(e) => update("comments", e.target.value)} /></Field><Field label="Highlighted sentences"><textarea rows="5" value={draft.highlights} onChange={(e) => update("highlights", e.target.value)} /></Field><Field label="Useful vocabulary / expressions"><textarea rows="5" value={draft.vocabulary} onChange={(e) => update("vocabulary", e.target.value)} placeholder="One item per line" /></Field><button className="primary-button"><Save size={16} /> Save article</button></form>;
}

function ArticleDetail({ article, onRead, onEdit, onDelete }) {
  const tags = splitTags(article.tags); const highlights = splitLines(article.highlights); const vocab = splitLines(article.vocabulary);
  return <article className="article-detail"><div className="section-heading"><div><p className="eyebrow">{article.category}</p><h2>{article.title}</h2><div className="detail-meta"><span><CalendarDays size={14} /> {formatDate(article.date)}</span><span>{article.status}</span><span>{article.difficulty}</span><span><FileText size={14} /> {getWordCount(article.articleText)} words</span><span><Clock3 size={14} /> {getReadingTime(article.articleText)}</span></div>{tags.length > 0 && <div className="tag-row">{tags.map((tag) => <span key={tag}><Tags size={12} /> {tag}</span>)}</div>}</div><div className="form-actions"><button className="primary-button" onClick={onRead}><Columns2 size={16} /> Reading mode</button>{article.link && <a className="ghost-button" href={normalizeUrl(article.link)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open</a>}<button className="ghost-button" onClick={onEdit}><PenLine size={16} /> Edit</button><button className="danger-button" onClick={onDelete}><Trash2 size={16} /> Delete</button></div></div><InfoBlock title="My summary" content={article.summary} /><InfoBlock title="My comments" content={article.comments} />{highlights.length > 0 && <section className="note-block"><h3>Highlighted sentences</h3><ul>{highlights.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></section>}{vocab.length > 0 && <section className="note-block"><h3>Useful vocabulary</h3><div className="vocab-chips">{vocab.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div></section>}{article.articleText && <section className="note-block article-preview"><h3>Article text</h3>{article.articleText.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>}</article>;
}

function ReadingMode({ article, onBack, onSave }) {
  const [notes, setNotes] = useState(normalizeArticle(article)); const [message, setMessage] = useState("");
  const update = (field, value) => { setNotes((current) => ({ ...current, [field]: value })); setMessage(""); };
  function save() { onSave(notes); setMessage("Saved"); window.setTimeout(() => setMessage(""), 1200); }
  function addSelection() { const selected = String(window.getSelection?.() || "").trim(); if (!selected) return alert("Select text in the article first."); update("highlights", notes.highlights ? `${notes.highlights}\n${selected}` : selected); window.getSelection?.().removeAllRanges?.(); }
  return <main className="reading-shell"><header className="reading-topbar"><button className="ghost-button" onClick={onBack}><ArrowLeft size={17} /> Back</button><div className="reading-title"><span>{article.category}</span><strong>{article.title}</strong></div><div className="form-actions">{article.link && <a className="ghost-button" href={normalizeUrl(article.link)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Original</a>}<button className="primary-button" onClick={save}><Save size={16} /> Save notes</button>{message && <span className="saved-pill">{message}</span>}</div></header><section className="reading-grid"><article className="reader-window"><div className="reader-window-head"><div><p className="eyebrow">Article window</p><h1>{article.title}</h1><p>{article.source || "No source"} · {getWordCount(article.articleText)} words · {getReadingTime(article.articleText)}</p></div><button className="ghost-button" onClick={addSelection}><ClipboardPlus size={16} /> Add selected text</button></div><div className="article-body">{article.articleText ? article.articleText.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <EmptyPage icon={<BookOpen />} title="No article text" text="Return to the editor and paste the article text." />}</div></article><aside className="notes-window"><p className="eyebrow"><Highlighter size={14} /> Notes window</p><h2>Read and write side by side</h2><Field label="Highlighted sentences"><textarea rows="7" value={notes.highlights} onChange={(e) => update("highlights", e.target.value)} /></Field><Field label="Useful vocabulary"><textarea rows="7" value={notes.vocabulary} onChange={(e) => update("vocabulary", e.target.value)} /></Field><Field label="My comments"><textarea rows="7" value={notes.comments} onChange={(e) => update("comments", e.target.value)} /></Field><Field label="Short summary"><textarea rows="6" value={notes.summary} onChange={(e) => update("summary", e.target.value)} /></Field></aside></section></main>;
}

function InfoBlock({ title, content }) { return <section className="note-block"><h3>{title}</h3><p>{content || "Nothing written yet."}</p></section>; }
function Field({ label, children }) { return <label className="field"><span>{label}</span>{children}</label>; }
function EmptyPage({ icon, title, text }) { return <div className="empty-page"><span>{icon}</span><h3>{title}</h3><p>{text}</p></div>; }
