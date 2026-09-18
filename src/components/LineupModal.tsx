import React from 'react';
import { X, Shield, Users, User, Award } from 'lucide-react';
import { Match, MatchLineup, Player } from '../types.js';

interface LineupModalProps {
  match: Match | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlayer: (playerName: string, teamIdHint?: string) => void;
}

export const LineupModal: React.FC<LineupModalProps> = ({
  match,
  isOpen,
  onClose,
  onSelectPlayer,
}) => {
  if (!isOpen || !match) return null;

  const lineup: MatchLineup | undefined = match.lineup;
  const starters = lineup?.starters || [];
  const bench = lineup?.bench || [];
  const formation = lineup?.formation || '4-3-3';
  const coach = lineup?.coach || 'Hovedtrener';

  // Group starters by position
  const keepers = starters.filter((p) => p.position === 'Keeper');
  const defenders = starters.filter((p) => p.position === 'Forsvar');
  const midfielders = starters.filter((p) => p.position === 'Midtbane');
  const forwards = starters.filter((p) => p.position === 'Angrep');

  return (
    <div
      id="lineup-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="lineup-modal-container"
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-700/80 flex items-center justify-center border border-emerald-500/40 text-white font-bold text-sm">
              ⚽
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                  {formation}
                </span>
                <span className="text-xs text-slate-300">Lagoppstilling</span>
              </div>
              <h3 className="font-bold text-base text-white leading-tight">
                {match.teamName}
              </h3>
            </div>
          </div>
          <button
            id="close-lineup-modal-btn"
            onClick={onClose}
            aria-label="Lukk lagoppstilling"
            className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match summary header */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
          <span className="font-medium truncate max-w-[65%]">
            {match.homeTeam} – {match.awayTeam}
          </span>
          <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
            {match.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : match.time}
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-5 text-slate-900 flex-1">
          {/* Soccer pitch visualizer */}
          <div className="bg-gradient-to-b from-emerald-700 via-emerald-800 to-emerald-900 rounded-xl p-4 shadow-inner border border-emerald-950 relative overflow-hidden text-white">
            {/* Field markings */}
            <div className="absolute inset-2 border-2 border-white/25 rounded pointer-events-none" />
            <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-white/20 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 w-16 h-16 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col justify-between h-72 py-1">
              {/* Forwards Row */}
              <div className="flex justify-around items-center">
                {forwards.map((p) => (
                  <PitchPlayerPin key={p.id} player={p} onClick={() => onSelectPlayer(p.name, match.teamId)} />
                ))}
              </div>

              {/* Midfield Row */}
              <div className="flex justify-around items-center">
                {midfielders.map((p) => (
                  <PitchPlayerPin key={p.id} player={p} onClick={() => onSelectPlayer(p.name, match.teamId)} />
                ))}
              </div>

              {/* Defense Row */}
              <div className="flex justify-around items-center">
                {defenders.map((p) => (
                  <PitchPlayerPin key={p.id} player={p} onClick={() => onSelectPlayer(p.name, match.teamId)} />
                ))}
              </div>

              {/* Keeper Row */}
              <div className="flex justify-center items-center">
                {keepers.map((p) => (
                  <PitchPlayerPin key={p.id} player={p} isKeeper onClick={() => onSelectPlayer(p.name, match.teamId)} />
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-slate-500 italic">
            Tips: Trykk på en spiller for å se spillerkort og sesongstatistikk
          </p>

          {/* Starters List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                Startoppstilling ({starters.length})
              </h4>
              <span className="text-xs text-slate-500 font-medium">Formasjon: {formation}</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
              {starters.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  onClick={() => onSelectPlayer(player.name, match.teamId)}
                />
              ))}
            </div>
          </div>

          {/* Bench / Reserves List */}
          {bench.length > 0 && (
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5 mb-2">
                <Shield className="w-4 h-4 text-slate-500" />
                Innbyttere / Reserver ({bench.length})
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                {bench.map((player) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    isBench
                    onClick={() => onSelectPlayer(player.name, match.teamId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Coach info */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-slate-600" />
              <div>
                <span className="text-slate-500 block">Lagledelse / Hovedtrener:</span>
                <span className="font-semibold text-slate-900">{coach}</span>
              </div>
            </div>
            <span className="bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded text-[11px] font-medium">
              Bønes IL
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="close-lineup-bottom-btn"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors shadow-xs active:scale-98"
          >
            Lukk oppstilling
          </button>
        </div>
      </div>
    </div>
  );
};

// Mini Pin component on the soccer pitch
const PitchPlayerPin: React.FC<{
  player: Player;
  isKeeper?: boolean;
  onClick: () => void;
}> = ({ player, isKeeper, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center group cursor-pointer focus:outline-hidden min-w-[56px] px-1 py-0.5 rounded-lg active:scale-95 transition-transform"
      title={`${player.name} (#${player.jerseyNumber})`}
    >
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-md border ${
          isKeeper
            ? 'bg-amber-400 text-slate-950 border-amber-200'
            : 'bg-white text-emerald-950 border-slate-200'
        } group-hover:ring-2 group-hover:ring-emerald-300 transition-all`}
      >
        {player.jerseyNumber}
      </div>
      <span className="text-[10px] font-semibold text-white drop-shadow-sm mt-0.5 max-w-[68px] truncate text-center bg-black/40 px-1 rounded">
        {player.name.split(' ').slice(-1)[0]}
        {player.role === 'Kaptein' && ' (K)'}
      </span>
    </button>
  );
};

// Row item in starter or bench lists
const PlayerRow: React.FC<{
  player: Player;
  isBench?: boolean;
  onClick: () => void;
}> = ({ player, isBench, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2.5 min-h-[44px] flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors focus:outline-hidden group"
    >
      <div className="flex items-center space-x-3 min-w-0">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
            player.position === 'Keeper'
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
          }`}
        >
          {player.jerseyNumber}
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
              {player.name}
            </span>
            {player.role === 'Kaptein' && (
              <span className="bg-amber-100 text-amber-900 font-bold text-[10px] px-1.5 py-0.2 rounded border border-amber-300 shrink-0">
                KAPTEIN
              </span>
            )}
            {player.role === 'Visekaptein' && (
              <span className="bg-slate-100 text-slate-700 font-medium text-[10px] px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                VISEKAPTEIN
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 font-normal">
            {player.position}
            {isBench && ' • Reserve'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        {player.goals > 0 && (
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            ⚽ {player.goals}
          </span>
        )}
        {player.yellowCards > 0 && (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
            🟨 {player.yellowCards}
          </span>
        )}
        <span className="text-xs text-slate-400 group-hover:text-emerald-600 font-medium">
          Kort →
        </span>
      </div>
    </button>
  );
};
