import React, { useState, useMemo } from 'react';
import { CoachNote, PlayerProfile } from '../types.js';
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Star,
  Tag,
  Calendar,
  User,
  Compass,
  Zap,
  Target,
  Shield,
  MessageSquare,
  Search,
  Filter,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import {
  getCoachNotesForPlayer,
  saveCoachNote,
  updateCoachNote,
  deleteCoachNote
} from '../utils/coachNotesStorage.js';

interface CoachNotesSectionProps {
  player: PlayerProfile;
  onNotesChange?: (notes: CoachNote[]) => void;
}

type NoteCategory = CoachNote['category'];

const CATEGORY_META: Record<
  NoteCategory,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    border: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
  }
> = {
  taktisk: {
    label: 'Taktisk forståelse',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    border: 'border-blue-200',
    icon: Compass,
    accentColor: '#165094',
  },
  teknisk: {
    label: 'Teknisk utførelse',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: Target,
    accentColor: '#059669',
  },
  holdning: {
    label: 'Holdning & Lederskap',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    border: 'border-amber-200',
    icon: Shield,
    accentColor: '#d97706',
  },
  fysisk: {
    label: 'Fysisk kapasitet',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    border: 'border-purple-200',
    icon: Zap,
    accentColor: '#7c3aed',
  },
  fokus: {
    label: 'Utviklingsfokus',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    border: 'border-cyan-200',
    icon: Award,
    accentColor: '#0891b2',
  },
  generelt: {
    label: 'Generell observasjon',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    border: 'border-slate-200',
    icon: FileText,
    accentColor: '#475569',
  },
};

export const CoachNotesSection: React.FC<CoachNotesSectionProps> = ({
  player,
  onNotesChange,
}) => {
  const playerKey = String(player.fiksId || player.name);

  // Initialize state with stored notes
  const [notes, setNotes] = useState<CoachNote[]>(() => {
    return getCoachNotesForPlayer(playerKey, player.name, player.position);
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | NoteCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);

  // Form inputs state
  const [formCategory, setFormCategory] = useState<NoteCategory>('taktisk');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formAuthor, setFormAuthor] = useState('Trenerteam Bønes IL');
  const [formAuthorRole, setFormAuthorRole] = useState('Hovedtrener');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTagsString, setFormTagsString] = useState('');
  const [formIsHighlight, setFormIsHighlight] = useState(false);
  const [formOpponent, setFormOpponent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Sync when player changes
  React.useEffect(() => {
    const loaded = getCoachNotesForPlayer(playerKey, player.name, player.position);
    setNotes(loaded);
    setIsFormOpen(false);
    setEditingNoteId(null);
  }, [playerKey, player.name, player.position]);

  // Notify parent of notes count/change
  const updateNotesState = (newNotes: CoachNote[]) => {
    setNotes(newNotes);
    if (onNotesChange) {
      onNotesChange(newNotes);
    }
  };

  const handleOpenNewNote = () => {
    setEditingNoteId(null);
    setFormCategory('taktisk');
    setFormTitle('');
    setFormContent('');
    setFormAuthor('Trenerteam Bønes IL');
    setFormAuthorRole('Hovedtrener');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTagsString('');
    setFormIsHighlight(false);
    setFormOpponent('');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleEditNote = (note: CoachNote) => {
    setEditingNoteId(note.id);
    setFormCategory(note.category);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormAuthor(note.author || 'Trenerteam Bønes IL');
    setFormAuthorRole(note.authorRole || 'Trener');
    setFormDate(note.date || new Date().toISOString().split('T')[0]);
    setFormTagsString((note.tags || []).join(', '));
    setFormIsHighlight(Boolean(note.isHighlight));
    setFormOpponent(note.opponent || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleDeleteNote = (noteId: string) => {
    if (window.confirm('Er du sikker på at du vil slette dette trenernotatet?')) {
      const updated = deleteCoachNote(playerKey, noteId);
      updateNotesState(updated);
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vennligst oppgi en tittel eller et emne for notatet.');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Vennligst skriv inn din kvalitative observasjon.');
      return;
    }

    const tags = formTagsString
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (editingNoteId) {
      const existing = notes.find((n) => n.id === editingNoteId);
      if (existing) {
        const updatedNote: CoachNote = {
          ...existing,
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
          author: formAuthor.trim(),
          authorRole: formAuthorRole.trim(),
          date: formDate,
          tags,
          isHighlight: formIsHighlight,
          opponent: formOpponent.trim() || undefined,
        };
        const res = updateCoachNote(playerKey, updatedNote);
        updateNotesState(res);
      }
    } else {
      const res = saveCoachNote(playerKey, {
        playerId: playerKey,
        playerName: player.name,
        title: formTitle.trim(),
        content: formContent.trim(),
        category: formCategory,
        author: formAuthor.trim(),
        authorRole: formAuthorRole.trim(),
        date: formDate,
        tags,
        isHighlight: formIsHighlight,
        opponent: formOpponent.trim() || undefined,
      });
      updateNotesState(res);
    }

    setIsFormOpen(false);
    setEditingNoteId(null);
    setFormError(null);
  };

  const handleCopyNote = (note: CoachNote) => {
    const text = `[Trenernotat for ${note.playerName} - ${note.date}]\nEmne: ${note.title} (${CATEGORY_META[note.category].label})\nForfatter: ${note.author} (${note.authorRole || 'Trener'})\nObservasjon:\n${note.content}\n${note.tags && note.tags.length > 0 ? `Nøkkelord: ${note.tags.join(', ')}` : ''}`;
    navigator.clipboard?.writeText(text);
    setCopiedNoteId(note.id);
    setTimeout(() => setCopiedNoteId(null), 2500);
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (activeCategoryFilter !== 'all' && note.category !== activeCategoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesContent = note.content.toLowerCase().includes(q);
        const matchesAuthor = note.author.toLowerCase().includes(q);
        const matchesTags = note.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesContent && !matchesAuthor && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  }, [notes, activeCategoryFilter, searchQuery]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    notes.forEach((n) => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notes]);

  // Recent opponents from player's match history for quick selection
  const recentOpponents = useMemo(() => {
    const opps = new Set<string>();
    (player.matchHistory || []).forEach((m) => {
      if (m.opponent) opps.add(m.opponent);
    });
    return Array.from(opps).slice(0, 8);
  }, [player.matchHistory]);

  return (
    <section
      id="coach-notes-section"
      className="bg-white rounded-xl border border-blue-200/80 shadow-xs overflow-hidden transition-all"
    >
      {/* Header bar */}
      <div className="bg-gradient-to-r from-[#165094] via-blue-900 to-slate-900 p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
            <MessageSquare className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Trenernotater & Spillerutvikling</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-950">
                  {notes.length} {notes.length === 1 ? 'notat' : 'notater'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-blue-100/90 mt-0.5 leading-relaxed">
              Kvalitative observasjoner, taktisk forståelse, holdning og treningsutvikling som ikke fanges opp av statistikk alene.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            id="btn-add-coach-note"
            onClick={isFormOpen ? () => setIsFormOpen(false) : handleOpenNewNote}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 text-xs font-black transition-all shadow-xs cursor-pointer"
          >
            {isFormOpen ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Lukk skjema</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Nytt trenernotat</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Inline Add / Edit Form */}
        {isFormOpen && (
          <form
            onSubmit={handleSaveForm}
            className="bg-slate-50 border-2 border-blue-300 rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200 shadow-inner"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#165094]" />
                <span>{editingNoteId ? 'Rediger trenernotat' : 'Opprett nytt trenernotat'}</span>
              </h4>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observasjonskategori <span className="text-red-500">*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as NoteCategory)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800"
                >
                  <option value="taktisk">🧠 Taktisk forståelse & Posisjonering</option>
                  <option value="teknisk">⚽ Teknisk utførelse & Ferdighet</option>
                  <option value="holdning">🤝 Holdning, Lederskap & Innsats</option>
                  <option value="fysisk">⚡ Fysisk kapasitet, Fart & Duellkraft</option>
                  <option value="fokus">🎯 Utviklingsfokus & Målsetting</option>
                  <option value="generelt">📋 Generell observasjon</option>
                </select>
              </div>

              {/* Title / Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tittel / Emne <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="f.eks. 'Orientering før mottak i pressede situasjoner'"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800 placeholder-slate-400"
                  required
                />
              </div>

              {/* Author Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trener / Observatør
                </label>
                <input
                  type="text"
                  placeholder="Navn på trener"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800"
                />
              </div>

              {/* Author Role & Date */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Rolle</label>
                  <select
                    value={formAuthorRole}
                    onChange={(e) => setFormAuthorRole(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800"
                  >
                    <option value="Hovedtrener">Hovedtrener</option>
                    <option value="Assistenttrener">Assistenttrener</option>
                    <option value="Spillerutvikler">Spillerutvikler</option>
                    <option value="Keepertrenere">Keepertrenere</option>
                    <option value="Lagleder">Lagleder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dato</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Optional Opponent Link */}
            {recentOpponents.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Knytt til motstander / kamp (valgfritt)
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {recentOpponents.map((opp) => (
                    <button
                      key={opp}
                      type="button"
                      onClick={() => setFormOpponent(formOpponent === opp ? '' : opp)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                        formOpponent === opp
                          ? 'bg-[#165094] text-white border-[#165094]'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {opp}
                    </button>
                  ))}
                  {formOpponent && (
                    <button
                      type="button"
                      onClick={() => setFormOpponent('')}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      Nullstill
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kvalitativ observasjon & vurdering <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                placeholder="Beskriv spillerens fremgang, taktiske modenhet, holdning i med- og motgang, eller konkrete fokusområder som skal følges opp på neste treningssamling..."
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800 placeholder-slate-400 leading-relaxed"
                required
              />
            </div>

            {/* Tags and Highlight Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nøkkelord / Tagger (kommaseparert)
                </label>
                <input
                  type="text"
                  placeholder="f.eks. Presspill, Orientering, Trygghet med ball"
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#165094] text-slate-800"
                />
              </div>

              <div className="pt-4 sm:pt-0">
                <label className="flex items-center space-x-2 cursor-pointer bg-white p-2.5 rounded-lg border border-slate-200 select-none hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={formIsHighlight}
                    onChange={(e) => setFormIsHighlight(e.target.checked)}
                    className="rounded text-[#165094] focus:ring-[#165094] w-4 h-4"
                  />
                  <Star className={`w-4 h-4 ${formIsHighlight ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-slate-800">
                    Marker som fremhevet observasjon / nøkkelnotat
                  </span>
                </label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Avbryt
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-[#165094] hover:bg-blue-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{editingNoteId ? 'Oppdater notat' : 'Lagre trenernotat'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Filter bar & search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            <button
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              Alle ({categoryCounts.all || 0})
            </button>

            {(Object.keys(CATEGORY_META) as NoteCategory[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const count = categoryCounts[cat] || 0;
              if (count === 0 && activeCategoryFilter !== cat) return null;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategoryFilter(cat)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeCategoryFilter === cat
                      ? `${meta.badgeBg} ${meta.badgeText} border ${meta.border} shadow-2xs`
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>
                    {meta.label} ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Søk i trenerobservasjoner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#165094] text-slate-800 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Notes Cards List */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">Ingen trenernotater funnet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {searchQuery || activeCategoryFilter !== 'all'
                ? 'Prøv å endre søk eller kategori-filter.'
                : 'Legg til den første kvalitative observasjonen om spillerens utvikling.'}
            </p>
            {!isFormOpen && (
              <button
                onClick={handleOpenNewNote}
                className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#165094] text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Legg til notat nå</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note) => {
              const meta = CATEGORY_META[note.category] || CATEGORY_META.generelt;
              const Icon = meta.icon;
              const isCopied = copiedNoteId === note.id;

              return (
                <div
                  key={note.id}
                  className={`rounded-xl border p-4 transition-all relative ${
                    note.isHighlight
                      ? 'bg-gradient-to-r from-amber-50/60 via-white to-blue-50/40 border-amber-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Top row: Category, Highlight, Date, Author, Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.border}`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{meta.label}</span>
                      </span>

                      {note.isHighlight && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Fremhevet</span>
                        </span>
                      )}

                      {note.opponent && (
                        <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          <span>vs {note.opponent}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="flex items-center space-x-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{note.date}</span>
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                        <button
                          onClick={() => handleCopyNote(note)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title="Kopier notat til utklippstavle"
                        >
                          {isCopied ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditNote(note)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-[#165094] transition-colors cursor-pointer"
                          title="Rediger notat"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Slett notat"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h5 className="text-sm font-bold text-slate-900 mt-2.5 tracking-tight flex items-center justify-between">
                    <span>{note.title}</span>
                  </h5>

                  {/* Observation Content */}
                  <p className="text-xs text-slate-700 leading-relaxed mt-1.5 whitespace-pre-line font-normal">
                    {note.content}
                  </p>

                  {/* Tags & Author Footnote */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      {note.tags && note.tags.length > 0 ? (
                        note.tags.map((t, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic">Ingen tagger</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-500 font-medium">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>
                        {note.author} {note.authorRole ? `(${note.authorRole})` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Qualitative Development Tips Banner */}
        <div className="bg-blue-50/70 border border-blue-200/60 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-blue-900">
          <Shield className="w-4 h-4 text-[#165094] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900">Bønes IL Spillerutvikling: </span>
            <span className="text-slate-700">
              Kvalitative trenerobservasjoner hjelper støtteapparatet med å følge opp taktiske fokusområder, holdning og samspill som supplerer mål, assists og ratingsystemet gjennom sesongen.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
