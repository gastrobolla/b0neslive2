import React, { useState } from 'react';
import { TeamInfo } from '../types.js';
import { Users, ChevronDown, Check } from 'lucide-react';

interface TeamSelectorProps {
  teams: TeamInfo[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
}

type GenderCategory = 'all' | 'Gutter' | 'Jenter';

function getTeamGender(team: TeamInfo): 'Gutter' | 'Jenter' {
  const name = team.name.toLowerCase();
  const short = team.shortName.toLowerCase();
  if (
    name.includes('jenter') ||
    name.includes('j1') ||
    short.startsWith('j') ||
    name.includes('kvinner') ||
    name.includes('old girls') ||
    team.id === 'bones-1'
  ) {
    return 'Jenter';
  }
  return 'Gutter';
}

function getSubGroup(team: TeamInfo): string {
  const short = team.shortName.toLowerCase();
  if (short.startsWith('g13') || short.startsWith('j13')) return '13 år';
  if (short.startsWith('g14') || short.startsWith('j14')) return '14 år';
  if (short.startsWith('g16') || short.startsWith('j16')) return '16 år';
  if (short.startsWith('g19') || short.startsWith('j19')) return 'Junior (G19)';
  if (short.includes('menn') || team.category === 'Senior') return 'Senior';
  if (team.id === 'bones-1' || short.includes('old')) return 'Old Girls / Senior';
  return 'Serie';
}

export const TeamSelector: React.FC<TeamSelectorProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam
}) => {
  const [activeGenderTab, setActiveGenderTab] = useState<GenderCategory>('all');

  const boysTeams = teams.filter(t => getTeamGender(t) === 'Gutter');
  const girlsTeams = teams.filter(t => getTeamGender(t) === 'Jenter');

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div id="team-selector-container" className="space-y-3">
      {/* Category Tab Selector: Alle, Gutter, Jenter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-lg">
          {/* Alle */}
          <button
            id="cat-tab-all"
            onClick={() => setActiveGenderTab('all')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeGenderTab === 'all'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Alle lag</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeGenderTab === 'all' ? 'bg-[#0F3A6D] text-blue-100' : 'bg-slate-200 text-slate-700'
            }`}>
              {teams.length}
            </span>
          </button>

          {/* Gutter */}
          <button
            id="cat-tab-gutter"
            onClick={() => setActiveGenderTab('Gutter')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeGenderTab === 'Gutter'
                ? 'bg-[#165094] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏃‍♂️ Gutter & Herrer</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeGenderTab === 'Gutter' ? 'bg-[#0F3A6D] text-blue-100' : 'bg-blue-100 text-[#165094]'
            }`}>
              {boysTeams.length}
            </span>
          </button>

          {/* Jenter */}
          <button
            id="cat-tab-jenter"
            onClick={() => setActiveGenderTab('Jenter')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeGenderTab === 'Jenter'
                ? 'bg-[#3E8A37] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏃‍♀️ Jenter & Damer</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeGenderTab === 'Jenter' ? 'bg-[#2E6C29] text-green-100' : 'bg-emerald-100 text-[#3E8A37]'
            }`}>
              {girlsTeams.length}
            </span>
          </button>
        </div>

        {/* Reset button if team selected */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            id="team-pill-all"
            onClick={() => onSelectTeam('all')}
            className={`px-3 py-1 rounded-md font-bold transition-all border ${
              selectedTeamId === 'all'
                ? 'bg-[#165094] text-white border-[#165094] shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {selectedTeamId === 'all' && <Check className="w-3 h-3 inline mr-1" />}
            Vis hele klubben (alle 16 lag)
          </button>
        </div>
      </div>

      {/* Categorized Lists */}
      <div className="space-y-3">
        {/* Gutter Section */}
        {(activeGenderTab === 'all' || activeGenderTab === 'Gutter') && (
          <div id="category-section-gutter" className="rounded-lg bg-slate-50/70 p-2.5 border border-slate-200/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#165094]"></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#165094]">
                  Gutter & Menn ({boysTeams.length} lag)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Ungdom (13-16 år), Junior (G19) og Senior 6. div
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {boysTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const sub = getSubGroup(team);
                return (
                  <button
                    key={team.id}
                    id={`team-pill-${team.id}`}
                    onClick={() => onSelectTeam(team.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#165094] text-white shadow-sm ring-2 ring-[#165094]/40 font-bold'
                        : 'bg-white text-slate-700 hover:bg-[#F0F6FC] hover:border-[#165094]/50 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="font-semibold">{team.shortName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isSelected
                          ? 'bg-[#3E8A37] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                      title={`Tabellplassering #${team.currentRank} i ${team.division}`}
                    >
                      #{team.currentRank}
                    </span>
                    <span className={`text-[9px] hidden sm:inline ${
                      isSelected ? 'text-blue-200' : 'text-slate-400'
                    }`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Jenter Section */}
        {(activeGenderTab === 'all' || activeGenderTab === 'Jenter') && (
          <div id="category-section-jenter" className="rounded-lg bg-emerald-50/40 p-2.5 border border-emerald-200/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#3E8A37]"></span>
                <h4 className="text-xs font-black uppercase tracking-wider text-[#3E8A37]">
                  Jenter & Kvinner ({girlsTeams.length} lag)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Ungdom (J13-J16) og Senior Old Girls
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {girlsTeams.map((team) => {
                const isSelected = selectedTeamId === team.id;
                const sub = getSubGroup(team);
                return (
                  <button
                    key={team.id}
                    id={`team-pill-${team.id}`}
                    onClick={() => onSelectTeam(team.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-[#3E8A37] text-white shadow-sm ring-2 ring-[#3E8A37]/40 font-bold'
                        : 'bg-white text-slate-700 hover:bg-emerald-50/70 hover:border-[#3E8A37]/50 border border-slate-200 shadow-2xs'
                    }`}
                  >
                    <span className="font-semibold">{team.shortName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        isSelected
                          ? 'bg-[#165094] text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                      title={`Tabellplassering #${team.currentRank} i ${team.division}`}
                    >
                      #{team.currentRank}
                    </span>
                    <span className={`text-[9px] hidden sm:inline ${
                      isSelected ? 'text-green-100' : 'text-slate-400'
                    }`}>
                      {sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Team Info Banner */}
      {selectedTeam && selectedTeamId !== 'all' && (
        <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">{selectedTeam.name}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600">{selectedTeam.division}</span>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-[#165094] font-semibold hidden sm:inline">Hjemmebane: {selectedTeam.homeGround}</span>
          </div>
          <button
            onClick={() => onSelectTeam('all')}
            className="text-[11px] font-bold text-[#165094] hover:underline"
          >
            Vis alle lag
          </button>
        </div>
      )}
    </div>
  );
};
