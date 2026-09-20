'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Music, Calendar, Clock, LogOut, Check, Heart, Bus, Download, RefreshCw, Eye, EyeOff, X, Trash2, Pencil, AlertTriangle, UserPlus } from 'lucide-react';

interface UserSession {
  role: 'client' | 'master';
  clientId: string;
  displayName: string;
}

// La sesión queda guardada en el navegador durante estos días
const SESSION_STORAGE_KEY = 'admin_session';
const SESSION_DAYS = 7;

interface ClientInfo {
  client_id: string;
  display_name: string;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rsvps' | 'songs'>('rsvps');

  const [rsvps, setRsvps] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [selectedRsvpId, setSelectedRsvpId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Edición y eliminación
  const [editing, setEditing] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Multi-tenant states
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [clientsList, setClientsList] = useState<ClientInfo[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('all');

  // Filters & Sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [busFilter, setBusFilter] = useState<'all' | 'ida' | 'vuelta' | 'both' | 'none'>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'intolerance'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc');

  // Filter and sort RSVPs for display (declared before early returns)
  const displayedMainRsvps = React.useMemo(() => {
    let result = rsvps.filter((r: any) => !r.parent_rsvp_id);
    const getCompanions = (mainId: string) => rsvps.filter((c: any) => c.parent_rsvp_id === mainId);

    result = result.filter((r: any) => {
      const companions = getCompanions(r.id);

      // Search term filter (main guest name or companion name)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const mainMatches = (r.guest_name || '').toLowerCase().includes(query);
        const companionMatches = companions.some((c: any) => (c.guest_name || '').toLowerCase().includes(query));
        if (!mainMatches && !companionMatches) return false;
      }

      // Attendance filter
      if (attendanceFilter !== 'all') {
        const isAttending = r.attending !== false;
        if (attendanceFilter === 'yes' && !isAttending) return false;
        if (attendanceFilter === 'no' && isAttending) return false;
      }

      // Bus filter
      if (busFilter !== 'all') {
        if (busFilter === 'ida') {
          const mainNeedsBus = r.bus_ida;
          const anyCompanionNeedsBus = companions.some((c: any) => c.bus_ida);
          if (!mainNeedsBus && !anyCompanionNeedsBus) return false;
        } else if (busFilter === 'vuelta') {
          const mainNeedsBus = r.bus_vuelta;
          const anyCompanionNeedsBus = companions.some((c: any) => c.bus_vuelta);
          if (!mainNeedsBus && !anyCompanionNeedsBus) return false;
        } else if (busFilter === 'both') {
          const mainNeedsBoth = r.bus_ida && r.bus_vuelta;
          const anyCompanionNeedsBoth = companions.some((c: any) => c.bus_ida && c.bus_vuelta);
          if (!mainNeedsBoth && !anyCompanionNeedsBoth) return false;
        } else if (busFilter === 'none') {
          const mainNeedsNone = !r.bus_ida && !r.bus_vuelta;
          const companionsNeedNone = companions.every((c: any) => !c.bus_ida && !c.bus_vuelta);
          if (!mainNeedsNone || !companionsNeedNone) return false;
        }
      }

      // Dietary filter
      if (dietaryFilter === 'intolerance') {
        const mainHasDiet = !!r.dietary_restrictions && r.dietary_restrictions !== '-';
        const companionHasDiet = companions.some((c: any) => !!c.dietary_restrictions && c.dietary_restrictions !== '-');
        if (!mainHasDiet && !companionHasDiet) return false;
      }

      return true;
    });

    // Sort
    result.sort((a: any, b: any) => {
      if (sortBy === 'name_asc') {
        return (a.guest_name || '').localeCompare(b.guest_name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.guest_name || '').localeCompare(a.guest_name || '');
      }
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (sortBy === 'date_asc') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });

    return result;
  }, [rsvps, searchTerm, attendanceFilter, busFilter, dietaryFilter, sortBy]);

  // Detalle abierto, derivado de la lista para que refleje ediciones y borrados
  const selectedRsvp = React.useMemo(() => {
    if (!selectedRsvpId) return null;
    const rsvp = rsvps.find((r: any) => r.id === selectedRsvpId);
    if (!rsvp) return null;
    return { rsvp, companions: rsvps.filter((c: any) => c.parent_rsvp_id === rsvp.id) };
  }, [rsvps, selectedRsvpId]);

  const saveSession = (session: UserSession, clients: ClientInfo[]) => {
    try {
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({
          session,
          clients,
          expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
        })
      );
    } catch {
      // si el navegador bloquea el almacenamiento, la sesión dura solo esta visita
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('verify_client_password', {
        input_username: username.trim().toLowerCase(),
        input_password: password.trim()
      });

      if (error) {
        console.error('Login RPC error:', error.message);
        alert('Error al iniciar sesión. Inténtalo de nuevo.');
        return;
      }

      if (data && data.length > 0) {
        const session: UserSession = {
          role: data[0].role as 'client' | 'master',
          clientId: data[0].client_id,
          displayName: data[0].display_name
        };
        setUserSession(session);
        setIsAuthenticated(true);

        // If master admin, fetch clients list
        let clients: ClientInfo[] = [];
        if (session.role === 'master') {
          const { data: listData } = await supabase.rpc('get_clients_list', {
            master_password: password.trim()
          });
          if (listData) {
            clients = listData;
            setClientsList(listData);
          }
        }

        saveSession(session, clients);
        await fetchData(session, session.role === 'master' ? 'all' : session.clientId);
      } else {
        alert('Usuario o contraseña incorrecta');
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async (sessionInfo = userSession, filterClientId = selectedClientId) => {
    if (!sessionInfo) return;
    setLoading(true);
    try {
      let rsvpsQuery = supabase.from('rsvps').select('*');
      let songsQuery = supabase.from('songs').select('*');

      if (sessionInfo.role === 'client') {
        rsvpsQuery = rsvpsQuery.eq('client_id', sessionInfo.clientId);
        songsQuery = songsQuery.eq('client_id', sessionInfo.clientId);
      } else if (filterClientId !== 'all') {
        rsvpsQuery = rsvpsQuery.eq('client_id', filterClientId);
        songsQuery = songsQuery.eq('client_id', filterClientId);
      }

      const [rsvpsRes, songsRes] = await Promise.all([
        rsvpsQuery.order('created_at', { ascending: false }),
        songsQuery.order('votes', { ascending: false })
      ]);

      if (rsvpsRes.data) setRsvps(rsvpsRes.data);
      if (songsRes.data) setSongs(songsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Recupera la sesión guardada al abrir o actualizar la página
  useEffect(() => {
    const restoreSession = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(SESSION_STORAGE_KEY);
      } catch {
        return;
      }
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        if (!parsed?.session?.role || !parsed?.expiresAt || Date.now() > parsed.expiresAt) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          return;
        }

        const session: UserSession = parsed.session;
        setUserSession(session);
        setIsAuthenticated(true);
        if (session.role === 'master' && Array.isArray(parsed.clients)) {
          setClientsList(parsed.clients);
        }
        fetchData(session, session.role === 'master' ? 'all' : session.clientId);
      } catch {
        try {
          localStorage.removeItem(SESSION_STORAGE_KEY);
        } catch {
          // nada que hacer
        }
      }
    };

    const timer = setTimeout(restoreSession, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClientFilterChange = async (clientId: string) => {
    setSelectedClientId(clientId);
    await fetchData(userSession, clientId);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // el navegador puede bloquear el almacenamiento: no es motivo para fallar
    }
    setIsAuthenticated(false);
    setUserSession(null);
    setRsvps([]);
    setSongs([]);
    setClientsList([]);
    setSelectedClientId('all');
    setUsername('');
    setPassword('');
  };

  const parentNameOf = (companion: any) => {
    const parent = rsvps.find((r: any) => r.id === companion.parent_rsvp_id);
    return parent?.guest_name || '';
  };

  const askDeleteSong = (song: any) => {
    setConfirmDialog({
      title: 'Eliminar canción',
      description: `Se eliminará «${song.title}»${song.artist ? ` de ${song.artist}` : ''} de la lista de sugerencias. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar canción',
      onConfirm: async () => {
        const { error } = await supabase.from('songs').delete().eq('id', song.id);
        if (error) throw error;
        setSongs(prevSongs => prevSongs.filter(s => s.id !== song.id));
      },
    });
  };

  const askDeleteRsvp = (rsvp: any, companions: any[]) => {
    const name = rsvp.guest_name || 'este invitado';
    setConfirmDialog({
      title: 'Eliminar confirmación',
      description: companions.length > 0
        ? `Se eliminará la confirmación de ${name} y también la de sus ${companions.length} acompañante${companions.length > 1 ? 's' : ''}. Esta acción no se puede deshacer.`
        : `Se eliminará la confirmación de ${name}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        if (companions.length > 0) {
          const { error: companionsError } = await supabase.from('rsvps').delete().eq('parent_rsvp_id', rsvp.id);
          if (companionsError) throw companionsError;
        }
        const { error } = await supabase.from('rsvps').delete().eq('id', rsvp.id);
        if (error) throw error;
        const deletedIds = new Set<string>([rsvp.id, ...companions.map((c: any) => c.id)]);
        setRsvps(prev => prev.filter((r: any) => !deletedIds.has(r.id)));
        setSelectedRsvpId(prev => (prev === rsvp.id ? null : prev));
      },
    });
  };

  const askDeleteCompanion = (companion: any) => {
    setConfirmDialog({
      title: 'Eliminar acompañante',
      description: (() => {
        const parentName = parentNameOf(companion);
        return `Se eliminará a ${companion.guest_name || 'este acompañante'}${parentName ? `, acompañante de ${parentName}` : ''}. Esta acción no se puede deshacer.`;
      })(),
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        const { error } = await supabase.from('rsvps').delete().eq('id', companion.id);
        if (error) throw error;
        setRsvps(prev => prev.filter((r: any) => r.id !== companion.id));
      },
    });
  };

  const runConfirm = async () => {
    if (!confirmDialog) return;
    setConfirmBusy(true);
    try {
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('No se pudo eliminar. Inténtalo de nuevo.');
    } finally {
      setConfirmBusy(false);
    }
  };

  const companionKeySeq = useRef(0);

  const newCompanionDraft = () => ({
    key: `nuevo-${(companionKeySeq.current += 1)}`,
    guest_name: '',
    dietary_restrictions: '',
    bus_ida: false,
    bus_vuelta: false,
  });

  // Abre la ficha completa: invitado principal + sus acompañantes
  const openGroupEdit = (rsvp: any, options?: { addCompanion?: boolean }) => {
    const companions = rsvps
      .filter((c: any) => c.parent_rsvp_id === rsvp.id)
      .map((c: any) => ({
        key: c.id,
        id: c.id,
        guest_name: c.guest_name || '',
        dietary_restrictions: c.dietary_restrictions || '',
        bus_ida: !!c.bus_ida,
        bus_vuelta: !!c.bus_vuelta,
      }));

    setEditing({
      mode: 'group',
      main: { ...rsvp },
      companions: options?.addCompanion ? [...companions, newCompanionDraft()] : companions,
      removedIds: [] as string[],
    });
  };

  // Ficha de un solo acompañante, indicando de quién es
  const openCompanionEdit = (companion: any) => {
    const parent = rsvps.find((r: any) => r.id === companion.parent_rsvp_id);
    if (!parent) return;
    setEditing({
      mode: 'companion',
      main: { ...parent },
      companions: [{
        key: companion.id,
        id: companion.id,
        guest_name: companion.guest_name || '',
        dietary_restrictions: companion.dietary_restrictions || '',
        bus_ida: !!companion.bus_ida,
        bus_vuelta: !!companion.bus_vuelta,
      }],
      removedIds: [] as string[],
    });
  };

  const updateMainField = (field: string, value: any) => {
    setEditing((prev: any) => (prev ? { ...prev, main: { ...prev.main, [field]: value } } : prev));
  };

  const updateCompanionField = (key: string, field: string, value: any) => {
    setEditing((prev: any) =>
      prev
        ? { ...prev, companions: prev.companions.map((c: any) => (c.key === key ? { ...c, [field]: value } : c)) }
        : prev
    );
  };

  const addCompanionDraft = () => {
    setEditing((prev: any) => (prev ? { ...prev, companions: [...prev.companions, newCompanionDraft()] } : prev));
  };

  const removeCompanionDraft = (companion: any) => {
    const drop = () => {
      setEditing((prev: any) =>
        prev
          ? {
              ...prev,
              companions: prev.companions.filter((c: any) => c.key !== companion.key),
              removedIds: companion.id ? [...prev.removedIds, companion.id] : prev.removedIds,
            }
          : prev
      );
    };

    // Los acompañantes que todavía no están guardados se quitan sin preguntar
    if (!companion.id) {
      drop();
      return;
    }

    setConfirmDialog({
      title: 'Quitar acompañante',
      description: `Se eliminará a ${companion.guest_name || 'este acompañante'} al guardar los cambios. Esta acción no se puede deshacer.`,
      confirmLabel: 'Quitar',
      onConfirm: async () => {
        drop();
      },
    });
  };

  // Guarda de una sola vez el invitado principal, sus acompañantes y los que se quitaron
  const handleSaveEdit = async () => {
    if (!editing) return;
    const draft = editing;
    setSavingEdit(true);
    try {
      const attending = draft.main.attending !== false;
      const mainPayload = {
        guest_name: (draft.main.guest_name || '').trim() || null,
        attending,
        dietary_restrictions: attending ? (draft.main.dietary_restrictions || '').trim() : '',
        bus_ida: attending ? !!draft.main.bus_ida : false,
        bus_vuelta: attending ? !!draft.main.bus_vuelta : false,
        message: (draft.main.message || '').trim(),
      };

      let mainData: any = null;
      if (draft.mode !== 'companion') {
        const { data, error: mainError } = await supabase
          .from('rsvps')
          .update(mainPayload)
          .eq('id', draft.main.id)
          .select()
          .single();
        if (mainError) throw mainError;
        mainData = data;
      }

      if (draft.removedIds.length > 0) {
        const { error: removeError } = await supabase.from('rsvps').delete().in('id', draft.removedIds);
        if (removeError) throw removeError;
      }

      const savedCompanions: any[] = [];
      const newCompanions: any[] = [];

      for (const companion of draft.companions) {
        const name = (companion.guest_name || '').trim();
        const payload = {
          guest_name: name || null,
          attending: true,
          dietary_restrictions: (companion.dietary_restrictions || '').trim(),
          bus_ida: !!companion.bus_ida,
          bus_vuelta: !!companion.bus_vuelta,
          message: '',
        };

        if (companion.id) {
          const { data, error } = await supabase.from('rsvps').update(payload).eq('id', companion.id).select().single();
          if (error) throw error;
          savedCompanions.push(data);
        } else if (name) {
          const { data, error } = await supabase
            .from('rsvps')
            .insert([{ ...payload, client_id: draft.main.client_id, parent_rsvp_id: draft.main.id }])
            .select()
            .single();
          if (error) throw error;
          newCompanions.push(data);
        }
      }

      setRsvps(prev => {
        const removed = new Set<string>(draft.removedIds);
        const changed = new Map<string, any>(
          [mainData, ...savedCompanions].filter(Boolean).map((r: any) => [r.id, r])
        );
        const next = prev
          .filter((r: any) => !removed.has(r.id))
          .map((r: any) => (changed.has(r.id) ? { ...r, ...changed.get(r.id) } : r));
        return [...next, ...newCompanions];
      });

      setEditing(null);
    } catch (error) {
      console.error('Error al guardar los cambios:', error);
      alert('No se pudieron guardar los cambios. Inténtalo de nuevo.');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg-light flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-primary/10 max-w-sm w-full text-center">
          <h1 className="font-serif text-2xl text-primary mb-2 italic">Acceso Maestro</h1>
          <p className="text-xs text-secondary mb-8">Panel de control de invitaciones</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 text-primary focus:outline-none focus:border-primary text-sm"
              autoCapitalize="none"
              autoComplete="username"
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-bg-warm/30 border border-primary/20 rounded p-3 pr-10 text-primary focus:outline-none focus:border-primary text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white uppercase tracking-widest text-[10px] rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const exportToCSV = (rows: any[][], headers: string[], filename: string) => {
    let csvContent = "\uFEFF";
    csvContent += headers.join(";") + "\n";

    rows.forEach(row => {
      const line = row.map(val => {
        const text = val === null || val === undefined ? '' : String(val);
        const escaped = text.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(";");
      csvContent += line + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportRsvps = () => {
    const headers = [
      ...(isMasterAll ? ['Evento'] : []),
      'Asiste',
      'Tipo',
      'Nombre',
      'Intolerancia / Dieta',
      'Autobús Ida',
      'Autobús Vuelta',
      'Mensaje',
      'Fecha'
    ];

    const dataRows: any[][] = [];
    displayedMainRsvps.forEach((r: any) => {
      const isAttending = r.attending !== false;
      const dateStr = new Date(r.created_at).toLocaleDateString('es-ES', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });

      dataRows.push([
        ...(isMasterAll ? [r.client_id] : []),
        isAttending ? 'SI' : 'NO',
        'Invitado Principal',
        r.guest_name || '-',
        r.dietary_restrictions || '-',
        isAttending && r.bus_ida ? 'SI' : 'NO',
        isAttending && r.bus_vuelta ? 'SI' : 'NO',
        r.message || '-',
        dateStr
      ]);

      const companions = rsvps.filter((c: any) => c.parent_rsvp_id === r.id);
      companions.forEach((c: any) => {
        dataRows.push([
          ...(isMasterAll ? [r.client_id] : []),
          'SI',
          `Acompañante de ${r.guest_name}`,
          c.guest_name || '-',
          c.dietary_restrictions || '-',
          c.bus_ida ? 'SI' : 'NO',
          c.bus_vuelta ? 'SI' : 'NO',
          '-',
          dateStr
        ]);
      });
    });

    const filename = `confirmaciones_${userSession?.role === 'master' ? selectedClientId : userSession?.clientId}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(dataRows, headers, filename);
  };

  const exportSongs = () => {
    const headers = [
      ...(isMasterAll ? ['Evento'] : []),
      'Votos',
      'Título de la Canción',
      'Artista'
    ];

    const dataRows = songs.map(s => [
      ...(isMasterAll ? [s.client_id] : []),
      s.votes,
      s.title,
      s.artist
    ]);

    const filename = `sugerencias_musica_${userSession?.role === 'master' ? selectedClientId : userSession?.clientId}_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(dataRows, headers, filename);
  };

  // Calculate stats
  const mainRsvps = rsvps.filter((r: any) => !r.parent_rsvp_id);
  const companionRows = rsvps.filter((r: any) => r.parent_rsvp_id);
  const attendingRsvps = mainRsvps.filter((r: any) => r.attending !== false);
  const notAttendingCount = mainRsvps.filter((r: any) => r.attending === false).length;
  const totalCompanions = companionRows.length;
  const totalGuests = attendingRsvps.length + totalCompanions;
  const busIdaCount = rsvps.filter((r: any) => r.bus_ida).length;
  const busVueltaCount = rsvps.filter((r: any) => r.bus_vuelta).length;

  const isMasterAll = userSession?.role === 'master' && selectedClientId === 'all';

  return (
    <div className="min-h-screen bg-bg-light text-primary font-sans">
      {/* Header */}
      <header className="bg-white border-b border-primary/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="font-serif text-xl italic font-light">
            {userSession?.role === 'master' ? 'Panel Maestro' : 'Panel de Control'}
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 text-xs uppercase tracking-wider text-secondary hover:text-primary transition-colors"
          >
            <span>Salir</span>
            <LogOut size={14} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Title and Filters row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-serif mb-1">
              {userSession?.role === 'master'
                ? (selectedClientId === 'all' ? 'Todos los Eventos' : clientsList.find(c => c.client_id === selectedClientId)?.display_name || selectedClientId)
                : userSession?.displayName}
            </h2>
            <p className="text-sm text-secondary">
              {userSession?.role === 'master' ? 'Consolidación de invitaciones' : 'Panel de control de confirmaciones'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0">
            {userSession?.role === 'master' && (
              <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded-lg border border-primary/10">
                <span className="text-xs text-secondary uppercase tracking-wider">Cliente:</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientFilterChange(e.target.value)}
                  className="bg-transparent text-primary focus:outline-none text-xs font-sans cursor-pointer py-1"
                >
                  <option value="all">Todos los eventos</option>
                  {clientsList.map((c) => (
                    <option key={c.client_id} value={c.client_id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex space-x-2 bg-white p-1 rounded-lg border border-primary/10">
              <button
                onClick={() => setActiveTab('rsvps')}
                className={`px-3 md:px-6 py-2 rounded-md text-xs uppercase tracking-wider transition-colors ${activeTab === 'rsvps' ? 'bg-primary text-white' : 'text-secondary hover:bg-bg-warm'}`}
              >
                Confirmaciones
              </button>
              <button
                onClick={() => setActiveTab('songs')}
                className={`px-3 md:px-6 py-2 rounded-md text-xs uppercase tracking-wider transition-colors ${activeTab === 'songs' ? 'bg-primary text-white' : 'text-secondary hover:bg-bg-warm'}`}
              >
                Música
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-secondary">Cargando datos...</div>
        ) : (
          <>
            {activeTab === 'rsvps' && (
              <div className="space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-lg border border-primary/10 shadow-sm">
                    <div className="flex items-center space-x-3 text-secondary mb-2">
                      <Users size={16} />
                      <span className="text-xs uppercase tracking-wider">Total Asistentes</span>
                    </div>
                    <p className="text-3xl font-serif">{totalGuests}</p>
                    <p className="text-[10px] text-secondary mt-1">{attendingRsvps.length} invitados · {totalCompanions} acomp.</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-primary/10 shadow-sm">
                    <div className="flex items-center space-x-3 text-secondary mb-2">
                      <Check size={16} />
                      <span className="text-xs uppercase tracking-wider">No Asisten</span>
                    </div>
                    <p className="text-3xl font-serif">{notAttendingCount}</p>
                    <p className="text-[10px] text-secondary mt-1">{rsvps.length} formularios total</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-primary/10 shadow-sm">
                    <div className="flex items-center space-x-3 text-secondary mb-2">
                      <Bus size={16} />
                      <span className="text-xs uppercase tracking-wider">Bus Ida</span>
                    </div>
                    <p className="text-3xl font-serif">{busIdaCount}</p>
                    <p className="text-[10px] text-secondary mt-1">personas en total</p>
                  </div>
                  <div className="bg-white p-5 rounded-lg border border-primary/10 shadow-sm">
                    <div className="flex items-center space-x-3 text-secondary mb-2">
                      <Bus size={16} />
                      <span className="text-xs uppercase tracking-wider">Bus Vuelta</span>
                    </div>
                    <p className="text-3xl font-serif">{busVueltaCount}</p>
                    <p className="text-[10px] text-secondary mt-1">personas en total</p>
                  </div>
                </div>

                {/* Export header */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4 rounded-lg border border-primary/10 shadow-sm">
                  <h3 className="font-serif text-lg text-primary">Confirmaciones</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchData()}
                      disabled={loading}
                      className="flex items-center space-x-2 text-xs uppercase tracking-wider font-semibold border border-primary/30 text-primary px-4 py-2 rounded-md hover:bg-bg-warm transition-colors cursor-pointer disabled:opacity-40"
                    >
                      <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                      <span>Actualizar</span>
                    </button>
                    <button
                      onClick={exportRsvps}
                      className="flex items-center space-x-2 text-xs uppercase tracking-wider font-semibold bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                    >
                      <Download size={14} />
                      <span>Descargar Excel</span>
                    </button>
                  </div>
                </div>

                {/* Filters and Search Bar */}
                <div className="bg-white p-4 rounded-lg border border-primary/10 shadow-sm space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3">
                    {/* Search Input */}
                    <div className="md:col-span-4 relative">
                      <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 pl-3 text-primary focus:outline-none focus:border-primary text-xs font-sans placeholder-secondary/50"
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Attendance Filter */}
                    <div className="md:col-span-2">
                      <select
                        value={attendanceFilter}
                        onChange={(e) => setAttendanceFilter(e.target.value as any)}
                        className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-xs font-sans cursor-pointer"
                      >
                        <option value="all">Asistencia: Todos</option>
                        <option value="yes">Sí asisten</option>
                        <option value="no">No asisten</option>
                      </select>
                    </div>

                    {/* Bus Filter */}
                    <div className="md:col-span-2">
                      <select
                        value={busFilter}
                        onChange={(e) => setBusFilter(e.target.value as any)}
                        className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-xs font-sans cursor-pointer"
                      >
                        <option value="all">Autobús: Todos</option>
                        <option value="ida">Bus Ida</option>
                        <option value="vuelta">Bus Vuelta</option>
                        <option value="both">Ambos Buses</option>
                        <option value="none">Sin Autobús</option>
                      </select>
                    </div>

                    {/* Dietary Filter */}
                    <div className="md:col-span-2">
                      <select
                        value={dietaryFilter}
                        onChange={(e) => setDietaryFilter(e.target.value as any)}
                        className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-xs font-sans cursor-pointer"
                      >
                        <option value="all">Dietas: Todos</option>
                        <option value="intolerance">Con intolerancia</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div className="md:col-span-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-xs font-sans cursor-pointer"
                      >
                        <option value="date_desc">Fecha (Novedades primero)</option>
                        <option value="date_asc">Fecha (Antiguos primero)</option>
                        <option value="name_asc">Nombre (A-Z)</option>
                        <option value="name_desc">Nombre (Z-A)</option>
                      </select>
                    </div>
                  </div>

                  {/* Active filters summary */}
                  {(searchTerm || attendanceFilter !== 'all' || busFilter !== 'all' || dietaryFilter !== 'all') && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/5 text-xs text-secondary">
                      <div>
                        Mostrando <span className="font-semibold text-primary">{displayedMainRsvps.length}</span> de <span className="font-semibold text-primary">{mainRsvps.length}</span> confirmaciones principales.
                      </div>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setAttendanceFilter('all');
                          setBusFilter('all');
                          setDietaryFilter('all');
                        }}
                        className="text-primary hover:underline font-medium"
                      >
                        Restablecer filtros
                      </button>
                    </div>
                  )}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {rsvps.length === 0 ? (
                    <div className="bg-white rounded-lg border border-primary/10 p-8 text-center text-secondary shadow-sm">
                      No hay confirmaciones todavía.
                    </div>
                  ) : displayedMainRsvps.length === 0 ? (
                    <div className="bg-white rounded-lg border border-primary/10 p-8 text-center text-secondary shadow-sm">
                      No se encontraron resultados con los filtros aplicados.
                    </div>
                  ) : (
                    displayedMainRsvps.map((rsvp: any) => {
                      const isAttending = rsvp.attending !== false;
                      const companions = rsvps.filter((c: any) => c.parent_rsvp_id === rsvp.id);
                      return (
                        <div key={rsvp.id} className="bg-white rounded-lg border border-primary/10 shadow-sm p-4">
                          {isMasterAll && (
                            <span className="text-[9px] uppercase tracking-wider font-bold text-secondary/60 block mb-1">{rsvp.client_id}</span>
                          )}
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-primary">
                                {rsvp.guest_name || '-'}
                                {companions.length > 0 && (
                                  <span className="ml-1.5 text-[10px] text-secondary bg-bg-warm px-1.5 py-0.5 rounded-full">+{companions.length}</span>
                                )}
                              </p>
                              <p className="text-[10px] text-secondary mt-0.5">
                                {new Date(rsvp.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setSelectedRsvpId(rsvp.id)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Ver detalle">
                                <Eye size={14} />
                              </button>
                              <button onClick={() => openGroupEdit(rsvp)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Editar">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => askDeleteRsvp(rsvp, companions)} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                                <Trash2 size={14} />
                              </button>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wide ${isAttending ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                                {isAttending ? 'Sí' : 'No'}
                              </span>
                            </div>
                          </div>
                          {isAttending && (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-primary/5 pt-3">
                              <div><span className="text-secondary">Intolerancia: </span><span className="text-primary">{rsvp.dietary_restrictions || '—'}</span></div>
                              <div><span className="text-secondary">Bus ida: </span><span className="text-primary">{rsvp.bus_ida ? 'Sí' : 'No'}</span></div>
                              <div><span className="text-secondary">Bus vuelta: </span><span className="text-primary">{rsvp.bus_vuelta ? 'Sí' : 'No'}</span></div>
                            </div>
                          )}
                          {rsvp.message && (
                            <p className="text-xs text-secondary italic mt-2 pt-2 border-t border-primary/5">"{rsvp.message}"</p>
                          )}
                          {companions.map((c: any, ci: number) => (
                            <div key={c.id} className="mt-2 pl-3 border-l-2 border-primary/10 pt-1 flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-primary font-medium">
                                  <span className="text-[9px] uppercase tracking-wider text-secondary/60 mr-1">Acomp. {ci + 1}</span>
                                  {c.guest_name || '-'}
                                </p>
                                <div className="text-[10px] text-secondary mt-0.5 flex gap-3">
                                  {c.dietary_restrictions && <span>Intol.: {c.dietary_restrictions}</span>}
                                  <span>Bus: {[c.bus_ida && 'Ida', c.bus_vuelta && 'Vuelta'].filter(Boolean).join(' + ') || 'No'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => openCompanionEdit(c)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Editar acompañante">
                                  <Pencil size={12} />
                                </button>
                                <button onClick={() => askDeleteCompanion(c)} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Eliminar acompañante">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-lg border border-primary/10 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-warm/30 border-b border-primary/10 text-xs uppercase tracking-wider text-secondary">
                          {isMasterAll && <th className="p-4 font-medium">Evento</th>}
                          <th className="p-4 font-medium">Asiste</th>
                          <th className="p-4 font-medium">Nombre</th>
                          <th className="p-4 font-medium">Intolerancia</th>
                          <th className="p-4 font-medium">Bus Ida</th>
                          <th className="p-4 font-medium">Bus Vuelta</th>
                          <th className="p-4 font-medium">Mensaje</th>
                          <th className="p-4 font-medium text-right">Fecha</th>
                          <th className="p-4 font-medium w-28 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5 text-sm">
                        {rsvps.length === 0 ? (
                          <tr>
                            <td colSpan={isMasterAll ? 9 : 8} className="p-8 text-center text-secondary">
                              No hay confirmaciones todavía.
                            </td>
                          </tr>
                        ) : displayedMainRsvps.length === 0 ? (
                          <tr>
                            <td colSpan={isMasterAll ? 9 : 8} className="p-8 text-center text-secondary">
                              No se encontraron resultados con los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          displayedMainRsvps.map((rsvp: any) => {
                            const isAttending = rsvp.attending !== false;
                            const companions = rsvps.filter((c: any) => c.parent_rsvp_id === rsvp.id);
                            return (
                              <React.Fragment key={rsvp.id}>
                                <tr className="hover:bg-bg-light/50 transition-colors">
                                  {isMasterAll && (
                                    <td className="p-4 font-bold text-xs uppercase tracking-wide text-secondary bg-bg-warm/10">
                                      {rsvp.client_id}
                                    </td>
                                  )}
                                  <td className="p-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold uppercase tracking-wide ${isAttending ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                                      {isAttending ? 'Sí' : 'No'}
                                    </span>
                                  </td>
                                  <td className="p-4 font-medium text-primary">
                                    {rsvp.guest_name || '-'}
                                    {companions.length > 0 && (
                                      <span className="ml-2 text-[10px] text-secondary bg-bg-warm px-1.5 py-0.5 rounded-full">+{companions.length}</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-secondary">{isAttending ? (rsvp.dietary_restrictions || '-') : '—'}</td>
                                  <td className="p-4 text-secondary">{isAttending && rsvp.bus_ida ? 'SI' : 'NO'}</td>
                                  <td className="p-4 text-secondary">{isAttending && rsvp.bus_vuelta ? 'SI' : 'NO'}</td>
                                  <td className="p-4 text-secondary max-w-xs truncate" title={rsvp.message}>{rsvp.message || '-'}</td>
                                  <td className="p-4 text-right text-secondary text-xs">
                                    {new Date(rsvp.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => setSelectedRsvpId(rsvp.id)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Ver detalle">
                                        <Eye size={14} />
                                      </button>
                                      <button onClick={() => openGroupEdit(rsvp)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Editar">
                                        <Pencil size={14} />
                                      </button>
                                      <button onClick={() => askDeleteRsvp(rsvp, companions)} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Eliminar">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {companions.map((c: any, ci: number) => (
                                  <tr key={c.id} className="bg-bg-light/60">
                                    {isMasterAll && <td className="pl-4 py-2" />}
                                    <td className="pl-4 py-2" />
                                    <td className="py-2 pl-8 pr-4 text-xs text-secondary border-l-2 border-primary/10">
                                      <span className="text-[9px] uppercase tracking-wider text-secondary/60 mr-1">Acomp. {ci + 1}</span>
                                      {c.guest_name || '-'}
                                    </td>
                                    <td className="py-2 px-4 text-xs text-secondary">{c.dietary_restrictions || '-'}</td>
                                    <td className="py-2 px-4 text-xs text-secondary">{c.bus_ida ? 'SI' : 'NO'}</td>
                                    <td className="py-2 px-4 text-xs text-secondary">{c.bus_vuelta ? 'SI' : 'NO'}</td>
                                    <td className="py-2 px-4" />
                                    <td className="py-2 px-4" />
                                    <td className="py-2 px-4">
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openCompanionEdit(c)} className="p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors" title="Editar acompañante">
                                          <Pencil size={13} />
                                        </button>
                                        <button onClick={() => askDeleteCompanion(c)} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Eliminar acompañante">
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </React.Fragment>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'songs' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-6 py-4 rounded-lg border border-primary/10 shadow-sm">
                  <h3 className="font-serif text-lg text-primary">Sugerencias de Música</h3>
                  <button
                    onClick={exportSongs}
                    className="flex items-center space-x-2 text-xs uppercase tracking-wider font-semibold bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Descargar Excel</span>
                  </button>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {songs.length === 0 ? (
                    <div className="bg-white rounded-lg border border-primary/10 p-8 text-center text-secondary shadow-sm">
                      No hay canciones sugeridas todavía.
                    </div>
                  ) : (
                    songs.map((song, index) => (
                      <div key={song.id} className="bg-white rounded-lg border border-primary/10 shadow-sm p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-bold text-primary/40 w-5 shrink-0 text-right">#{index + 1}</span>
                          <div className="min-w-0">
                            {isMasterAll && <span className="text-[9px] uppercase tracking-wider font-bold text-secondary/60 block">{song.client_id}</span>}
                            <p className="font-medium text-primary text-sm truncate">{song.title}</p>
                            <p className="text-xs text-secondary truncate">{song.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <div className="inline-flex items-center space-x-1 bg-bg-warm px-2 py-1 rounded text-primary font-medium text-xs">
                            <Heart size={11} className="fill-primary/20" />
                            <span>{song.votes}</span>
                          </div>
                          <button
                            onClick={() => askDeleteSong(song)}
                            className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                            title="Eliminar canción"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-lg border border-primary/10 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-bg-warm/30 border-b border-primary/10 text-xs uppercase tracking-wider text-secondary">
                          {isMasterAll && <th className="p-4 font-medium">Evento</th>}
                          <th className="p-4 font-medium w-16 text-center">Votos</th>
                          <th className="p-4 font-medium">Título de la Canción</th>
                          <th className="p-4 font-medium">Artista</th>
                          <th className="p-4 w-12 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5 text-sm">
                        {songs.length === 0 ? (
                          <tr>
                            <td colSpan={isMasterAll ? 5 : 4} className="p-8 text-center text-secondary">
                              No hay canciones sugeridas todavía.
                            </td>
                          </tr>
                        ) : (
                          songs.map((song) => (
                            <tr key={song.id} className="hover:bg-bg-light/50 transition-colors">
                              {isMasterAll && (
                                <td className="p-4 font-bold text-xs uppercase tracking-wide text-secondary bg-bg-warm/10">
                                  {song.client_id}
                                </td>
                              )}
                              <td className="p-4 text-center">
                                <div className="inline-flex items-center space-x-1 bg-bg-warm px-2 py-1 rounded text-primary font-medium">
                                  <Heart size={12} className="fill-primary/20" />
                                  <span>{song.votes}</span>
                                </div>
                              </td>
                              <td className="p-4 font-medium text-primary">{song.title}</td>
                              <td className="p-4 text-secondary">{song.artist}</td>
                              <td className="p-4 text-center">
                                <button
                                  onClick={() => askDeleteSong(song)}
                                  className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                                  title="Eliminar canción"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}
          </>
        )}
      </main>

      {/* Detail modal */}
      {selectedRsvp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedRsvpId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedRsvpId(null)} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors">
              <X size={16} />
            </button>

            <div className="mb-5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide mb-2 ${selectedRsvp.rsvp.attending !== false ? 'bg-primary/10 text-primary' : 'bg-red-50 text-red-500'}`}>
                {selectedRsvp.rsvp.attending !== false ? 'Asiste' : 'No asiste'}
              </span>
              <h3 className="font-serif text-xl text-accent">{selectedRsvp.rsvp.guest_name || '-'}</h3>
              <p className="text-[11px] text-secondary mt-1">
                {new Date(selectedRsvp.rsvp.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {selectedRsvp.rsvp.attending !== false && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-bg-light rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Intolerancia</p>
                    <p className="text-primary">{selectedRsvp.rsvp.dietary_restrictions || 'Ninguna'}</p>
                  </div>
                  <div className="bg-bg-light rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Autobús</p>
                    <p className="text-primary">
                      {[selectedRsvp.rsvp.bus_ida && 'Ida', selectedRsvp.rsvp.bus_vuelta && 'Vuelta'].filter(Boolean).join(' + ') || 'No'}
                    </p>
                  </div>
                </div>

                {selectedRsvp.companions.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-2">Acompañantes ({selectedRsvp.companions.length})</p>
                    <div className="space-y-2">
                      {selectedRsvp.companions.map((c: any, i: number) => (
                        <div key={c.id} className="bg-bg-light rounded-lg p-3 border-l-2 border-primary/20 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-primary">{c.guest_name || '-'}</p>
                            <p className="text-[11px] text-secondary mt-0.5">
                              Intol.: {c.dietary_restrictions || 'Ninguna'} · Bus: {[c.bus_ida && 'Ida', c.bus_vuelta && 'Vuelta'].filter(Boolean).join(' + ') || 'No'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => openCompanionEdit(c)} className="p-1.5 rounded-full hover:bg-white text-secondary transition-colors" title="Editar acompañante">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => askDeleteCompanion(c)} className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors" title="Eliminar acompañante">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRsvp.rsvp.message && (
                  <div className="bg-bg-light rounded-lg p-3">
                    <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Mensaje</p>
                    <p className="text-primary italic">"{selectedRsvp.rsvp.message}"</p>
                  </div>
                )}
              </div>
            )}

            {selectedRsvp.rsvp.attending === false && selectedRsvp.rsvp.message && (
              <div className="bg-bg-light rounded-lg p-3 text-sm">
                <p className="text-[10px] uppercase tracking-wider text-secondary mb-1">Mensaje</p>
                <p className="text-primary italic">"{selectedRsvp.rsvp.message}"</p>
              </div>
            )}

            {selectedRsvp.rsvp.attending !== false && (
              <button
                onClick={() => openGroupEdit(selectedRsvp.rsvp, { addCompanion: true })}
                className="w-full mt-6 flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-primary/30 text-primary hover:bg-bg-warm/50 transition-colors text-[10px] uppercase tracking-widest font-semibold"
              >
                <UserPlus size={14} />
                Añadir acompañante
              </button>
            )}

            <div className="flex gap-2 mt-3 pt-4 border-t border-primary/10">
              <button
                onClick={() => openGroupEdit(selectedRsvp.rsvp)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border border-primary/20 text-primary hover:bg-bg-warm/50 transition-colors text-[10px] uppercase tracking-widest font-semibold"
              >
                <Pencil size={13} />
                Editar
              </button>
              <button
                onClick={() => askDeleteRsvp(selectedRsvp.rsvp, selectedRsvp.companions)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md border border-red-200 text-red-500 hover:bg-red-50 transition-colors text-[10px] uppercase tracking-widest font-semibold"
              >
                <Trash2 size={13} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición: invitado principal + acompañantes */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => !savingEdit && setEditing(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[88vh] overflow-y-auto p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setEditing(null)}
              disabled={savingEdit}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-bg-warm text-secondary transition-colors disabled:opacity-50"
            >
              <X size={16} />
            </button>

            <h3 className="font-serif text-xl text-accent mb-1">
              {editing.mode === 'companion' ? 'Editar acompañante' : 'Editar confirmación'}
            </h3>
            {editing.mode === 'companion' ? (
              <p className="text-xs text-primary mb-5">
                Acompañante de: <span className="font-semibold">{editing.main.guest_name || 'invitado sin nombre'}</span>
              </p>
            ) : (
              <p className="text-[11px] text-secondary mb-5">
                Podés cambiar los datos del invitado y de sus acompañantes, quitar acompañantes o añadir nuevos. Todo se guarda junto al pulsar «Guardar cambios».
              </p>
            )}

            {editing.mode !== 'companion' && (
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-secondary mb-1.5 font-semibold">Nombre</label>
                <input
                  type="text"
                  value={editing.main.guest_name || ''}
                  onChange={(e) => updateMainField('guest_name', e.target.value)}
                  className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-secondary mb-1.5 font-semibold">¿Asiste?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateMainField('attending', true)}
                    className={`flex-1 py-2 rounded text-[10px] uppercase tracking-widest font-semibold border transition-colors ${editing.main.attending !== false ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-primary/20 hover:border-primary/50'}`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => updateMainField('attending', false)}
                    className={`flex-1 py-2 rounded text-[10px] uppercase tracking-widest font-semibold border transition-colors ${editing.main.attending === false ? 'bg-primary text-white border-primary' : 'bg-white text-secondary border-primary/20 hover:border-primary/50'}`}
                  >
                    No
                  </button>
                </div>
              </div>

              {editing.main.attending !== false && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-secondary mb-1.5 font-semibold">Intolerancia o alergia</label>
                    <input
                      type="text"
                      value={editing.main.dietary_restrictions || ''}
                      onChange={(e) => updateMainField('dietary_restrictions', e.target.value)}
                      placeholder="Ninguna"
                      className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 bg-bg-light rounded-lg p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editing.main.bus_ida}
                        onChange={(e) => updateMainField('bus_ida', e.target.checked)}
                        className="accent-[#7d8c5c]"
                      />
                      <span className="text-xs text-primary">Bus ida</span>
                    </label>
                    <label className="flex items-center gap-2 bg-bg-light rounded-lg p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editing.main.bus_vuelta}
                        onChange={(e) => updateMainField('bus_vuelta', e.target.checked)}
                        className="accent-[#7d8c5c]"
                      />
                      <span className="text-xs text-primary">Bus vuelta</span>
                    </label>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-secondary mb-1.5 font-semibold">Mensaje</label>
                <textarea
                  value={editing.main.message || ''}
                  onChange={(e) => updateMainField('message', e.target.value)}
                  rows={3}
                  className="w-full bg-bg-warm/20 border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-sm resize-none"
                />
              </div>
            </div>
            )}

            {/* Acompañantes */}
            <div className={editing.mode === 'companion' ? '' : 'mt-6 pt-5 border-t border-primary/10'}>
              {editing.mode !== 'companion' && (
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-wider text-secondary font-semibold">
                    Acompañantes ({editing.companions.length})
                  </p>
                </div>
              )}

              {editing.mode !== 'companion' && editing.main.attending === false ? (
                <p className="text-xs text-secondary bg-bg-light rounded-lg p-3">
                  El invitado no asiste. Si tenía acompañantes, quitalos desde aquí marcando que sí asiste, o eliminá la confirmación completa.
                </p>
              ) : (
                <>
                  {editing.companions.length === 0 && (
                    <p className="text-xs text-secondary mb-3">Todavía no tiene acompañantes.</p>
                  )}

                  <div className="space-y-3">
                    {editing.companions.map((companion: any, index: number) => (
                      <div key={companion.key} className="bg-bg-light rounded-lg p-3 border-l-2 border-primary/20 space-y-3">
                        {editing.mode !== 'companion' && (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] uppercase tracking-wider text-secondary/70 font-semibold">
                              Acompañante {index + 1}{!companion.id && ' · nuevo'}
                            </span>
                            <button
                              onClick={() => removeCompanionDraft(companion)}
                              disabled={savingEdit}
                              className="p-1.5 rounded-full hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                              title="Quitar acompañante"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}

                        <input
                          type="text"
                          value={companion.guest_name || ''}
                          onChange={(e) => updateCompanionField(companion.key, 'guest_name', e.target.value)}
                          placeholder="Nombre y apellidos"
                          className="w-full bg-white border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-sm"
                        />
                        <input
                          type="text"
                          value={companion.dietary_restrictions || ''}
                          onChange={(e) => updateCompanionField(companion.key, 'dietary_restrictions', e.target.value)}
                          placeholder="Intolerancia o alergia (opcional)"
                          className="w-full bg-white border border-primary/20 rounded p-2.5 text-primary focus:outline-none focus:border-primary text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 bg-white rounded-lg p-2.5 cursor-pointer border border-primary/10">
                            <input
                              type="checkbox"
                              checked={!!companion.bus_ida}
                              onChange={(e) => updateCompanionField(companion.key, 'bus_ida', e.target.checked)}
                              className="accent-[#7d8c5c]"
                            />
                            <span className="text-xs text-primary">Bus ida</span>
                          </label>
                          <label className="flex items-center gap-2 bg-white rounded-lg p-2.5 cursor-pointer border border-primary/10">
                            <input
                              type="checkbox"
                              checked={!!companion.bus_vuelta}
                              onChange={(e) => updateCompanionField(companion.key, 'bus_vuelta', e.target.checked)}
                              className="accent-[#7d8c5c]"
                            />
                            <span className="text-xs text-primary">Bus vuelta</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {editing.mode !== 'companion' && (
                  <button
                    onClick={addCompanionDraft}
                    disabled={savingEdit}
                    className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-md border border-dashed border-primary/30 text-primary hover:bg-bg-warm/50 transition-colors text-[10px] uppercase tracking-widest font-semibold disabled:opacity-50"
                  >
                    <UserPlus size={14} />
                    Añadir acompañante
                  </button>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setEditing(null)}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-md border border-primary/20 text-secondary hover:bg-bg-warm/50 transition-colors text-[10px] uppercase tracking-widest font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors text-[10px] uppercase tracking-widest font-semibold disabled:opacity-50"
              >
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !confirmBusy && setConfirmDialog(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 text-red-500 mb-4">
              <AlertTriangle size={22} />
            </div>
            <h3 className="font-serif text-lg text-accent mb-2">{confirmDialog.title}</h3>
            <p className="text-sm text-secondary leading-relaxed mb-6">{confirmDialog.description}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                disabled={confirmBusy}
                className="flex-1 py-2.5 rounded-md border border-primary/20 text-secondary hover:bg-bg-warm/50 transition-colors text-[10px] uppercase tracking-widest font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={runConfirm}
                disabled={confirmBusy}
                className="flex-1 py-2.5 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors text-[10px] uppercase tracking-widest font-semibold disabled:opacity-50"
              >
                {confirmBusy ? 'Eliminando...' : confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
