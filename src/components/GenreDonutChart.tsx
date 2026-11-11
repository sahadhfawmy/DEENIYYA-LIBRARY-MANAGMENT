import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Book, BookCopy } from '../types';
import {
  PieChart,
  BookOpen,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronRight,
  Bookmark,
} from 'lucide-react';

interface GenreDonutChartProps {
  books: Book[];
  copies: BookCopy[];
  onNavigateGenre?: (genre: string) => void;
  is3D?: boolean;
}

export interface GenreItem {
  id: string;
  name: string;
  arName: string;
  dewey: string;
  count: number;
  copyCount: number;
  percentage: number;
  color: string;
  accentBg: string;
}

// Canonical Islamic Heritage Disciplines with standardized color palettes
const CANONICAL_GENRES: {
  id: string;
  name: string;
  arName: string;
  dewey: string;
  color: string;
  accentBg: string;
  keywords: string[];
}[] = [
  {
    id: 'fiqh',
    name: 'Islamic Jurisprudence (Fiqh)',
    arName: 'الفقه الإسلامي وأصوله',
    dewey: '230-249',
    color: '#059669', // Emerald
    accentBg: 'rgba(5, 150, 105, 0.15)',
    keywords: ['فقه', 'أصول', 'معاملات', 'عبادات', 'قواعد', 'شافعي', 'حنفي', 'مالكي', 'حنبلي', 'fiqh', 'usul', 'jurisprudence'],
  },
  {
    id: 'hadith',
    name: 'Hadith Collections & Studies',
    arName: 'الحديث الشريف وعلومه',
    dewey: '220-229',
    color: '#d97706', // Champagne Gold / Amber
    accentBg: 'rgba(217, 119, 6, 0.15)',
    keywords: ['حديث', 'بخاري', 'مسلم', 'سنن', 'مصطلح', 'رجال', 'أسانيد', 'شرح', 'hadith', 'bukhari', 'muslim', 'sunnah'],
  },
  {
    id: 'tafsir',
    name: 'Quranic Sciences & Tafsir',
    arName: 'علوم القرآن الكريم والتفسير',
    dewey: '210-219',
    color: '#0284c7', // Sapphire Blue
    accentBg: 'rgba(2, 132, 199, 0.15)',
    keywords: ['تفسير', 'قرآن', 'تجويد', 'قراءات', 'معاني', 'نزول', 'tafsir', 'quran', 'quranic'],
  },
  {
    id: 'arabic',
    name: 'Arabic Grammar & Linguistics',
    arName: 'اللغة العربية والنحو والصرف',
    dewey: '410-419',
    color: '#9333ea', // Royal Amethyst
    accentBg: 'rgba(147, 51, 234, 0.15)',
    keywords: ['نحو', 'صرف', 'بلاغة', 'أدب', 'معاجم', 'لغة', 'شعر', 'arabic', 'nahw', 'sarf', 'grammar', 'linguistics'],
  },
  {
    id: 'aqeedah',
    name: 'Islamic Creed & Theology',
    arName: 'العقيدة والتوحيد وأصول الدين',
    dewey: '200-209',
    color: '#0d9488', // Persian Teal
    accentBg: 'rgba(13, 148, 136, 0.15)',
    keywords: ['عقيدة', 'توحيد', 'أصول الدين', 'كلام', 'إيمان', 'aqeedah', 'theology', 'creed'],
  },
  {
    id: 'seerah',
    name: 'Prophetic Biography & History',
    arName: 'السيرة النبوية والتاريخ الإسلامي',
    dewey: '290-299',
    color: '#e11d48', // Ruby Rose
    accentBg: 'rgba(225, 29, 72, 0.15)',
    keywords: ['سيرة', 'تاريخ', 'تراجم', 'طبقات', 'مغازي', 'صحابة', 'seerah', 'history', 'biography'],
  },
  {
    id: 'adab',
    name: 'Islamic Ethics & Cultivation',
    arName: 'الأخلاق والآداب والتزكية',
    dewey: '250-259',
    color: '#ca8a04', // Antique Gold
    accentBg: 'rgba(202, 138, 4, 0.15)',
    keywords: ['أخلاق', 'آداب', 'تزكية', 'رقائق', 'مواعظ', 'تربية', 'ethics', 'morals', 'adab', 'tasawwuf'],
  },
  {
    id: 'general',
    name: 'General & Contemporary Studies',
    arName: 'الدراسات والبحوث المعاصرة',
    dewey: '000-199',
    color: '#475569', // Slate
    accentBg: 'rgba(71, 85, 105, 0.15)',
    keywords: ['معارف', 'بحوث', 'دراسات', 'فكر', 'مجلات', 'معاصر', 'general', 'studies', 'reference'],
  },
];

export const GenreDonutChart: React.FC<GenreDonutChartProps> = ({
  books,
  copies,
  onNavigateGenre,
  is3D = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [metricMode, setMetricMode] = useState<'titles' | 'copies'>('titles');
  const [hoveredGenre, setHoveredGenre] = useState<GenreItem | null>(null);
  const [selectedGenreId, setSelectedGenreId] = useState<string | null>(null);

  // Pre-index copy counts by book ID for fast lookups
  const copiesCountByBook = useMemo(() => {
    const map = new Map<string, number>();
    copies.forEach((c) => {
      map.set(c.b, (map.get(c.b) || 0) + 1);
    });
    return map;
  }, [copies]);

  // Aggregate book catalog into canonical and distinct genre buckets
  const genreData = useMemo<GenreItem[]>(() => {
    const unarchivedBooks = books.filter((b) => !b.arch);
    const totalTitles = unarchivedBooks.length;
    if (totalTitles === 0) return [];

    // Bucket counters
    const titleCounters: Record<string, number> = {};
    const copyCounters: Record<string, number> = {};

    CANONICAL_GENRES.forEach((g) => {
      titleCounters[g.id] = 0;
      copyCounters[g.id] = 0;
    });

    unarchivedBooks.forEach((book) => {
      const categoryText = (book.k || '').toLowerCase();
      const titleText = (book.t || '').toLowerCase();
      const deweyText = (book.c || '').toLowerCase();
      const combined = `${categoryText} ${titleText} ${deweyText}`;

      let matchedGenreId = 'general';

      // Check Dewey classification numbers first
      if (deweyText) {
        if (deweyText.startsWith('23') || deweyText.startsWith('24')) matchedGenreId = 'fiqh';
        else if (deweyText.startsWith('22')) matchedGenreId = 'hadith';
        else if (deweyText.startsWith('21')) matchedGenreId = 'tafsir';
        else if (deweyText.startsWith('41') || deweyText.startsWith('49')) matchedGenreId = 'arabic';
        else if (deweyText.startsWith('20')) matchedGenreId = 'aqeedah';
        else if (deweyText.startsWith('29') || deweyText.startsWith('9')) matchedGenreId = 'seerah';
        else if (deweyText.startsWith('25')) matchedGenreId = 'adab';
      }

      // Check keywords if not matched by Dewey
      if (matchedGenreId === 'general') {
        for (const genre of CANONICAL_GENRES) {
          if (genre.id === 'general') continue;
          if (genre.keywords.some((kw) => combined.includes(kw))) {
            matchedGenreId = genre.id;
            break;
          }
        }
      }

      titleCounters[matchedGenreId] = (titleCounters[matchedGenreId] || 0) + 1;
      const copiesForThisBook = copiesCountByBook.get(book.id) || 1;
      copyCounters[matchedGenreId] = (copyCounters[matchedGenreId] || 0) + copiesForThisBook;
    });

    const totalMetricValue =
      metricMode === 'titles'
        ? totalTitles
        : Object.values(copyCounters).reduce((acc, curr) => acc + curr, 0);

    return CANONICAL_GENRES.map((g) => {
      const val = metricMode === 'titles' ? titleCounters[g.id] || 0 : copyCounters[g.id] || 0;
      const pct = totalMetricValue > 0 ? (val / totalMetricValue) * 100 : 0;
      return {
        id: g.id,
        name: g.name,
        arName: g.arName,
        dewey: g.dewey,
        count: titleCounters[g.id] || 0,
        copyCount: copyCounters[g.id] || 0,
        percentage: Number(pct.toFixed(1)),
        color: g.color,
        accentBg: g.accentBg,
      };
    })
      .filter((g) => g.count > 0 || g.copyCount > 0)
      .sort((a, b) => {
        const valA = metricMode === 'titles' ? a.count : a.copyCount;
        const valB = metricMode === 'titles' ? b.count : b.copyCount;
        return valB - valA;
      });
  }, [books, copiesCountByBook, metricMode]);

  // Overall catalog totals
  const totalTitles = useMemo(() => books.filter((b) => !b.arch).length, [books]);
  const totalPhysicalCopies = useMemo(() => copies.length, [copies]);
  const activeGenre = hoveredGenre || genreData.find((g) => g.id === selectedGenreId) || null;

  // D3 Render Effect
  useEffect(() => {
    if (!svgRef.current || genreData.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 340;
    const height = 340;
    const radius = Math.min(width, height) / 2;
    const innerRadius = radius * 0.62; // Donut thickness
    const outerRadius = radius * 0.94;
    const hoverOuterRadius = radius * 0.98;

    // Defs for subtle shadows and gradients
    const defs = svg.append('defs');

    // Filter for arc drop shadow
    const filter = defs
      .append('filter')
      .attr('id', 'd3-donut-glow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '4')
      .attr('stdDeviation', '6')
      .attr('flood-color', 'rgba(0,0,0,0.3)');

    // Main Chart Container centered
    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // D3 Pie Generator
    const pie = d3
      .pie<GenreItem>()
      .value((d) => (metricMode === 'titles' ? d.count : d.copyCount))
      .sort(null)
      .padAngle(0.025);

    // D3 Arc Generator
    const arcGenerator = d3
      .arc<d3.PieArcDatum<GenreItem>>()
      .innerRadius(innerRadius)
      .outerRadius((d) => {
        const isHovered = activeGenre && activeGenre.id === d.data.id;
        return isHovered ? hoverOuterRadius : outerRadius;
      })
      .cornerRadius(5);

    const pieData = pie(genreData);

    // Group for slices
    const slices = g
      .selectAll<SVGPathElement, d3.PieArcDatum<GenreItem>>('.arc-slice')
      .data(pieData)
      .enter()
      .append('path')
      .attr('class', 'arc-slice')
      .attr('d', arcGenerator as any)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#022416')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('transition', 'all 200ms cubic-bezier(0.16, 1, 0.3, 1)')
      .style('opacity', (d) => {
        if (!activeGenre) return 1;
        return activeGenre.id === d.data.id ? 1 : 0.45;
      })
      .attr('filter', (d) =>
        activeGenre && activeGenre.id === d.data.id ? 'url(#d3-donut-glow)' : 'none'
      )
      .on('mouseenter', function (_event, d) {
        setHoveredGenre(d.data);
      })
      .on('mouseleave', function () {
        setHoveredGenre(null);
      })
      .on('click', function (_event, d) {
        setSelectedGenreId((prev) => (prev === d.data.id ? null : d.data.id));
        if (onNavigateGenre) {
          onNavigateGenre(d.data.name);
        }
      });

    // Subtle center decorative ring
    g.append('circle')
      .attr('r', innerRadius - 4)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(212, 175, 55, 0.25)')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-width', 1.5);
  }, [genreData, metricMode, activeGenre, onNavigateGenre]);

  return (
    <div
      className={`rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#022416] via-[#043320] to-[#021f14] text-white shadow-xl overflow-hidden ${
        is3D ? 'shadow-2xl ring-1 ring-amber-500/20' : ''
      }`}
    >
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-0.5 rounded-full bg-emerald-900/80 border border-amber-400/30 text-amber-200 text-xs font-semibold">
            <PieChart className="w-3.5 h-3.5 text-amber-300" />
            <span>D3.js Interactive Bibliographic Analytics</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
            <span>Genre & Discipline Distribution</span>
            <span className="text-amber-300 font-arabic text-base font-normal">
              · توزيع الفنون والعلوم
            </span>
          </h3>
          <p className="text-xs text-emerald-200/80">
            Real-time D3 visualization across {totalTitles.toLocaleString()} titles and{' '}
            {totalPhysicalCopies.toLocaleString()} physical copies in the college repository.
          </p>
        </div>

        {/* Metric Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/40 border border-white/10 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setMetricMode('titles')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              metricMode === 'titles'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-sm ring-1 ring-amber-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            By Titles · بالعناوين
          </button>
          <button
            onClick={() => setMetricMode('copies')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              metricMode === 'copies'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm ring-1 ring-emerald-400/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            By Copies · بالنسخ
          </button>
        </div>
      </div>

      {/* Main Grid: D3 Donut Visualizer (Left) + Interactive Genre Ledger (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6">
        {/* Left Column: D3 Donut Chart with Center HUD (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[360px] p-2 bg-black/20 rounded-2xl border border-white/5">
          <div className="relative w-[340px] h-[340px] flex items-center justify-center">
            {/* D3 SVG Canvas */}
            <svg
              ref={svgRef}
              viewBox="0 0 340 340"
              className="w-full h-full select-none"
              style={{ filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.4))' }}
            />

            {/* Center HUD Info Card */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-8 transition-all duration-200"
              style={{ width: 190, height: 190, margin: 'auto' }}
            >
              {activeGenre ? (
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-150">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mb-0.5"
                    style={{ backgroundColor: activeGenre.color }}
                  />
                  <div className="text-xs font-semibold text-amber-200 font-arabic truncate max-w-[160px]">
                    {activeGenre.arName}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-white tracking-tight">
                    {metricMode === 'titles'
                      ? activeGenre.count.toLocaleString()
                      : activeGenre.copyCount.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-400 font-mono">
                    {activeGenre.percentage}% of catalog
                  </div>
                  <div className="text-[10px] text-slate-300 font-sans truncate max-w-[150px]">
                    {activeGenre.name}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="text-amber-400/90 font-arabic text-xs font-semibold block">
                    المكتبة المركزية
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono tabular-nums text-amber-100 tracking-tight">
                    {metricMode === 'titles'
                      ? totalTitles.toLocaleString()
                      : totalPhysicalCopies.toLocaleString()}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-sans">
                    {metricMode === 'titles' ? 'Active Titles' : 'Physical Copies'}
                  </div>
                  <div className="text-[10px] text-slate-400 pt-0.5">
                    Hover slice for details
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Caption */}
          <div className="text-center pt-2 text-xs text-slate-400">
            Click any genre slice or row to inspect catalog records
          </div>
        </div>

        {/* Right Column: Ranked Interactive Discipline Ledger (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-1 text-xs">
            <span className="font-bold text-amber-200 uppercase tracking-wider font-sans">
              Classified Disciplines ({genreData.length})
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              Dewey Decimal Notation & Distribution
            </span>
          </div>

          {/* Scrollable / Stacked Genre Breakdown Rows */}
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {genreData.map((genre) => {
              const isHovered = activeGenre && activeGenre.id === genre.id;
              const isSelected = selectedGenreId === genre.id;
              const value = metricMode === 'titles' ? genre.count : genre.copyCount;

              return (
                <div
                  key={genre.id}
                  onMouseEnter={() => setHoveredGenre(genre)}
                  onMouseLeave={() => setHoveredGenre(null)}
                  onClick={() => {
                    setSelectedGenreId((prev) => (prev === genre.id ? null : genre.id));
                    if (onNavigateGenre) {
                      onNavigateGenre(genre.name);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isHovered || isSelected
                      ? 'bg-white/15 border-amber-400/60 shadow-md ring-1 ring-amber-400/30'
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {/* Left: Swatch + Title Details */}
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-lg shrink-0 shadow-sm"
                      style={{ backgroundColor: genre.color }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-xs sm:text-sm text-white truncate">
                          {genre.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/30 text-amber-300/90 border border-white/10 shrink-0">
                          DDC {genre.dewey}
                        </span>
                      </div>
                      <div className="text-[11px] font-arabic text-amber-200/90 truncate">
                        {genre.arName}
                      </div>
                    </div>
                  </div>

                  {/* Right: Metrics + Progress Gauge */}
                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono text-xs sm:text-sm font-bold text-white tabular-nums">
                        {value.toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-400 font-sans">
                          {metricMode === 'titles' ? 'titles' : 'copies'}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400 tabular-nums">
                        {genre.percentage}%
                      </div>
                    </div>

                    <div className="w-16 sm:w-20 bg-black/40 h-2 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(genre.percentage * 2, 100)}%`,
                          backgroundColor: genre.color,
                        }}
                      />
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-300 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Insights Footer */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-100/90 bg-black/20 p-3 rounded-2xl">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                <b>Primary Core Discipline:</b> {genreData[0]?.name || 'Islamic Jurisprudence'} (
                {genreData[0]?.percentage || 0}%)
              </span>
            </div>
            {onNavigateGenre && (
              <button
                onClick={() => onNavigateGenre('all')}
                className="inline-flex items-center space-x-1.5 text-amber-300 hover:text-white font-semibold transition"
              >
                <span>Browse Full Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
