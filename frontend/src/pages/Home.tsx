import { useEffect, useMemo, useState, type FormEvent } from "react";
import AuthShell from "../components/AuthShell";
import { get, patch, post, type AccountType, type Session } from "../lib/api";

type Relationship = { id: string; subject_user_id: string; related_user_id: string; relationship_type: string; authority_basis: string; status: string; created_at: string };
type Profile = Record<string, string | string[] | null | undefined> & {
  verification_status?: string;
};

type Field = {
  name: string; label: string; help: string; kind?: "text" | "textarea" | "list" | "select";
  options?: { value: string; label: string }[]; section: string;
};

const profileConfig: Partial<Record<AccountType, { title: string; description: string; fields: Field[] }>> = {
  autistic_person: {
    title: "Mi perfil personal",
    description: "Este espacio está pensado para que cuentes cómo eres, qué te gusta y qué apoyos te hacen sentir bien. Tú decides qué compartir.",
    fields: [
      { section: "Sobre mí", name: "display_name", label: "Nombre para mostrar", help: "Cómo quieres que te llamemos." },
      { section: "Sobre mí", name: "pronouns", label: "Pronombres (opcional)", help: "Por ejemplo: ella, él, elle. Puedes dejarlo vacío." },
      { section: "Comunicación y entorno", name: "communication_preferences", label: "Cómo prefiero comunicarme", help: "Habla, escritura, pictogramas, tiempo para responder u otras preferencias.", kind: "textarea" },
      { section: "Comunicación y entorno", name: "sensory_preferences", label: "Preferencias sensoriales", help: "Sonidos, luces, texturas o estímulos que te resultan cómodos o difíciles.", kind: "textarea" },
      { section: "Comunicación y entorno", name: "preferred_environment", label: "Entornos en los que me siento bien", help: "Describe espacios o condiciones que te ayudan." , kind: "textarea"},
      { section: "Mis intereses y fortalezas", name: "interests", label: "Intereses", help: "Separa cada interés con una coma.", kind: "list" },
      { section: "Mis intereses y fortalezas", name: "strengths", label: "Fortalezas y habilidades", help: "Separa cada fortaleza con una coma.", kind: "list" },
      { section: "Apoyos y rutinas", name: "routines", label: "Rutinas que me ayudan", help: "Puedes describir anticipación, transiciones o actividades cotidianas.", kind: "textarea" },
      { section: "Apoyos y rutinas", name: "support_preferences", label: "Apoyos que prefiero", help: "Qué pueden hacer otras personas para acompañarte respetuosamente.", kind: "textarea" },
      { section: "Apoyos y rutinas", name: "things_to_avoid", label: "Cosas que prefiero evitar", help: "Situaciones o formas de apoyo que no te funcionan.", kind: "textarea" }
    ]
  },
  parent_guardian: {
    title: "Mi perfil familiar",
    description: "Registra tus datos de contacto y cómo prefieres comunicarte. Este perfil no crea por sí solo acceso al seguimiento de otra persona.",
    fields: [
      { section: "Contacto", name: "phone", label: "Teléfono de contacto", help: "Incluye el indicativo del país si corresponde." },
      { section: "Contacto", name: "preferred_contact_method", label: "Medio de contacto preferido", help: "Cómo prefieres recibir comunicaciones.", kind: "select", options: [{ value: "email", label: "Correo electrónico" }, { value: "phone", label: "Llamada telefónica" }, { value: "whatsapp", label: "WhatsApp" }] },
      { section: "Sobre el acompañamiento", name: "relationship_to_person", label: "Relación con la persona a acompañar", help: "Esta información es descriptiva y no sustituye la verificación de autoridad.", kind: "select", options: [{ value: "mother", label: "Madre" }, { value: "father", label: "Padre" }, { value: "legal_guardian", label: "Representante legal" }, { value: "caregiver", label: "Cuidador/a" }, { value: "other", label: "Otra relación" }] },
      { section: "Sobre el acompañamiento", name: "preferred_language", label: "Idioma preferido", help: "Por ejemplo: español." },
      { section: "Sobre el acompañamiento", name: "availability", label: "Disponibilidad para comunicaciones", help: "Días u horarios en los que prefieres ser contactado.", kind: "textarea" },
      { section: "Sobre el acompañamiento", name: "notes", label: "Información adicional (opcional)", help: "Solo información útil para coordinar comunicaciones.", kind: "textarea" }
    ]
  },
  teacher: {
    title: "Mi perfil docente",
    description: "Completa tu información profesional. La vinculación con estudiantes y la verificación institucional se gestionan por separado.",
    fields: [
      { section: "Información profesional", name: "professional_title", label: "Cargo o título profesional", help: "Ej. docente titular, orientador/a, docente de apoyo." },
      { section: "Información profesional", name: "institution_name", label: "Institución educativa", help: "Nombre oficial de la institución." },
      { section: "Información profesional", name: "institution_email", label: "Correo institucional", help: "Debe ser una dirección de correo válida." },
      { section: "Experiencia", name: "subjects_or_areas", label: "Áreas o asignaturas", help: "Separa cada área con una coma.", kind: "list" },
      { section: "Experiencia", name: "grade_levels", label: "Grados o niveles educativos", help: "Separa cada nivel con una coma.", kind: "list" },
      { section: "Experiencia", name: "professional_bio", label: "Presentación profesional", help: "Resumen breve de tu experiencia y enfoque.", kind: "textarea" },
      { section: "Acompañamiento y contacto", name: "support_approach", label: "Enfoque de acompañamiento", help: "Estrategias de inclusión, comunicación y apoyos que utilizas.", kind: "textarea" },
      { section: "Acompañamiento y contacto", name: "preferred_contact_method", label: "Medio de contacto preferido", help: "Cómo prefieres recibir comunicaciones.", kind: "select", options: [{ value: "email", label: "Correo electrónico" }, { value: "phone", label: "Llamada telefónica" }, { value: "whatsapp", label: "WhatsApp" }] }
    ]
  }
};

export default function Home({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const accountType = session.user.accountType;
  const config = useMemo(() => accountType ? profileConfig[accountType] : null, [accountType]);
  const [profile, setProfile] = useState<Profile>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteExpiry, setInviteExpiry] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [relationshipType, setRelationshipType] = useState("parent");
  const [authorityBasis, setAuthorityBasis] = useState("subject_consent");
  const [relationshipMessage, setRelationshipMessage] = useState("");
  const [relationshipBusy, setRelationshipBusy] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [emotion, setEmotion] = useState("calma");
  const [intensity, setIntensity] = useState("3");
  const [emotionNote, setEmotionNote] = useState("");
  const [observationStudent, setObservationStudent] = useState("");
  const [observationText, setObservationText] = useState("");
  const [dashboardMessage, setDashboardMessage] = useState("");
  const [consents, setConsents] = useState<any[]>([]);
  const [consentBusy, setConsentBusy] = useState(false);
  const [teacherAccess, setTeacherAccess] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    get<any>("/dashboard", session.accessToken).then(result => {
      if (!active) return;
      if (result.ok) setDashboard(result.data);
      else setDashboardError(result.message);
    });
    return () => { active = false; };
  }, [session.accessToken]);

  async function submitEmotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDashboardMessage("");
    const result = await post<{entry:any}>("/dashboard/emotions", { emotion, intensity:Number(intensity), note:emotionNote }, session.accessToken);
    if (result.ok) { setEmotionNote(""); setDashboardMessage("Registro emocional guardado."); const fresh=await get<any>("/dashboard",session.accessToken); if(fresh.ok)setDashboard(fresh.data); }
    else setDashboardMessage(result.message);
  }
  async function submitObservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setDashboardMessage("");
    const result = await post<{observation:any}>("/dashboard/observations", { studentId:observationStudent, content:observationText, visibility:"authorized_team" }, session.accessToken);
    if (result.ok) { setObservationText(""); setDashboardMessage("Observación guardada."); const fresh=await get<any>("/dashboard",session.accessToken); if(fresh.ok)setDashboard(fresh.data); }
    else setDashboardMessage(result.message);
  }

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setLoading(true);
      const result = await get<{ profile: Profile | null }>("/profiles/me", session.accessToken);
      if (!active) return;
      if (!result.ok) {
        setError(result.message);
      } else {
        const current = result.data.profile ?? {};
        setProfile(current);
        const next: Record<string, string> = {};
        for (const field of config?.fields ?? []) {
          const value = current[field.name];
          next[field.name] = Array.isArray(value) ? value.join(", ") : value == null ? "" : String(value);
        }
        setValues(next);
      }
      setLoading(false);
    }
    if (config) void loadProfile();
    return () => { active = false; };
  }, [config, session.accessToken]);

  async function refreshRelationships() {
    const result = await get<{ relationships: Relationship[] }>("/relationships", session.accessToken);
    if (result.ok) setRelationships(result.data.relationships);
  }

  useEffect(() => { if (accountType !== "admin") void refreshRelationships(); }, [session.accessToken, accountType]);

  async function refreshAccess() {
    const [consentResult, teacherResult] = await Promise.all([
      get<{ consents: any[] }>("/access/consents", session.accessToken),
      get<{ access: any[] }>("/access/teacher-access", session.accessToken)
    ]);
    if (consentResult.ok) setConsents(consentResult.data.consents);
    if (teacherResult.ok) setTeacherAccess(teacherResult.data.access);
  }

  useEffect(() => { void refreshAccess(); }, [session.accessToken]);

  async function revokeConsent(relationshipId: string) {
    if (consentBusy) return;
    setConsentBusy(true);
    const result = await post(`/access/consents/${relationshipId}/revoke`, {}, session.accessToken);
    setDashboardMessage(result.ok ? "Permisos revocados. El acceso compartido queda bloqueado." : result.message);
    if (result.ok) { await refreshAccess(); await refreshRelationships(); }
    setConsentBusy(false);
  }

  async function generateInvite() {
    setRelationshipBusy(true); setRelationshipMessage("");
    const result = await post<{ code: string; expiresAt: string }>("/relationships/invites", {}, session.accessToken);
    if (result.ok) { setInviteCode(result.data.code); setInviteExpiry(result.data.expiresAt); setRelationshipMessage("Comparte este código únicamente con la persona que deseas vincular. Vence en 15 minutos."); }
    else setRelationshipMessage(result.message);
    setRelationshipBusy(false);
  }

  async function redeemRelationship(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setRelationshipBusy(true); setRelationshipMessage("");
    const result = await post<{ relationship: Relationship }>("/relationships/redeem", { code: redeemCode, relationshipType, authorityBasis }, session.accessToken);
    if (result.ok) { setRedeemCode(""); setRelationshipMessage("Solicitud enviada. No se comparte seguimiento hasta que sea autorizada."); await refreshRelationships(); }
    else setRelationshipMessage(result.message);
    setRelationshipBusy(false);
  }

  async function respondRelationship(id: string, action: "accept" | "reject" | "revoke") {
    setRelationshipBusy(true); setRelationshipMessage("");
    const result = await post<{ relationship: Relationship }>(`/relationships/${id}/respond`, { action }, session.accessToken);
    setRelationshipMessage(result.ok ? "La vinculación se actualizó." : result.message);
    if (result.ok) await refreshRelationships();
    setRelationshipBusy(false);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountType || saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    const payload: Record<string, string | string[] | null> = {};
    for (const field of config?.fields ?? []) {
      const value = values[field.name]?.trim() ?? "";
      payload[field.name] = field.kind === "list"
        ? value.split(",").map((item) => item.trim()).filter(Boolean)
        : value || null;
    }
    const result = await patch<{ profile: Profile }>("/profiles/me", payload, session.accessToken);
    if (result.ok) {
      setProfile(result.data.profile);
      setMessage("Tus datos se guardaron correctamente.");
    } else {
      setError(result.message);
    }
    setSaving(false);
  }

  if (!config && accountType !== "admin") {
    return <AuthShell title="Perfil no disponible" subtitle="No encontramos un tipo de cuenta válido."><button onClick={onLogout}>Cerrar sesión</button></AuthShell>;
  }

  return (
    <AuthShell title={`Hola, ${session.user.fullName ?? session.user.email}`} subtitle="Bienvenido a tu espacio de Nébula.">
      <section className="profile-dashboard">
        <section className="profile-next-step">
          <span className="profile-kicker">PANEL DE CONTROL · {accountType === "autistic_person" ? "PERSONAL" : accountType === "parent_guardian" ? "FAMILIAR" : accountType === "teacher" ? "DOCENTE" : "ADMINISTRACIÓN"}</span>
          <h2>{accountType === "autistic_person" ? "Mi bienestar" : accountType === "parent_guardian" ? "Personas a mi cuidado" : accountType === "teacher" ? "Mi espacio educativo" : "Administración de Nébula"}</h2>
          {dashboardError && <p className="error" role="alert">{dashboardError}</p>}
          {!dashboard && !dashboardError && <p className="muted">Cargando información autorizada…</p>}
          {dashboard?.role === "autistic_person" && <>
            <div className="dashboard-stats"><article><strong>{dashboard.data.emotions.length}</strong><span>registros emocionales recientes</span></article><article><strong>{dashboard.data.plans.length}</strong><span>planes de apoyo</span></article><article><strong>{dashboard.data.alerts.filter((a:any)=>a.status === "open").length}</strong><span>alertas abiertas</span></article></div>
            <form className="profile-form" onSubmit={submitEmotion}><h3>¿Cómo te sientes hoy?</h3><label className="field"><span>Emoción</span><select value={emotion} onChange={e=>setEmotion(e.target.value)}>{["alegría","calma","tristeza","ansiedad","enojo","frustración","cansancio","saturación","otro"].map(v=><option key={v}>{v}</option>)}</select></label><label className="field"><span>Intensidad: {intensity}/5</span><input type="range" min="1" max="5" value={intensity} onChange={e=>setIntensity(e.target.value)}/></label><label className="field"><span>Nota (opcional)</span><textarea value={emotionNote} onChange={e=>setEmotionNote(e.target.value)} maxLength={1000}/></label><button type="submit">Guardar cómo me siento</button></form>
            <h3>Mi historial reciente</h3>{dashboard.data.emotions.map((e:any)=><article className="relationship-item" key={e.id}><strong>{e.emotion}</strong> · intensidad {e.intensity}/5 <small>{new Date(e.created_at).toLocaleString()}</small>{e.note && <p>{e.note}</p>}</article>)}
            <h3>Mis planes de apoyo</h3>{dashboard.data.plans.map((p:any)=><article className="relationship-item" key={p.id}><strong>{p.title}</strong><p>{p.goals}</p><small>{p.status}</small></article>)}
            <h3>Alertas</h3>{dashboard.data.alerts.map((a:any)=><article className="relationship-item" key={a.id}><strong>{a.summary}</strong><p>{a.details}</p><small>{a.severity} · {a.status}</small></article>)}
          </>}
          {(dashboard?.role === "parent_guardian" || dashboard?.role === "teacher") && <>
            <div className="dashboard-stats"><article><strong>{dashboard.data.students.length}</strong><span>personas con acceso autorizado</span></article><article><strong>{dashboard.data.observations.length}</strong><span>observaciones visibles</span></article><article><strong>{dashboard.data.alerts.length}</strong><span>alertas autorizadas</span></article></div>
            {dashboard.data.students.length === 0 && <p className="muted">Aún no hay personas vinculadas con permisos activos. El acceso aparecerá cuando se complete la autorización correspondiente.</p>}
            <h3>Personas vinculadas</h3>{dashboard.data.students.map((st:any)=><article className="relationship-item" key={st.id}><strong>{st.display_name || st.full_name || "Perfil"}</strong><small>Información limitada a los permisos concedidos.</small></article>)}
            {dashboard.role === "teacher" && dashboard.data.students.length>0 && <form className="profile-form" onSubmit={submitObservation}><h3>Registrar observación educativa</h3><label className="field"><span>Estudiante</span><select required value={observationStudent} onChange={e=>setObservationStudent(e.target.value)}><option value="">Selecciona</option>{dashboard.data.students.map((st:any)=><option key={st.id} value={st.id}>{st.display_name || st.full_name}</option>)}</select></label><label className="field"><span>Observación</span><textarea required maxLength={4000} value={observationText} onChange={e=>setObservationText(e.target.value)}/></label><button>Guardar observación</button></form>}
            <h3>Observaciones autorizadas</h3>{dashboard.data.observations.map((o:any)=><article className="relationship-item" key={o.id}><strong>{o.category}</strong><p>{o.content}</p><small>{o.observation_date}</small></article>)}
            <h3>Planes de apoyo e informes</h3>{[...dashboard.data.plans,...dashboard.data.reports].map((p:any)=><article className="relationship-item" key={p.id}><strong>{p.title}</strong><small>{p.status}</small></article>)}
            <h3>Alertas autorizadas</h3>{dashboard.data.alerts.map((a:any)=><article className="relationship-item" key={a.id}><strong>{a.summary}</strong><small>{a.severity} · {a.status}</small></article>)}
          </>}
          {dashboard?.role === "admin" && <><div className="dashboard-stats"><article><strong>{dashboard.data.users.length}</strong><span>usuarios recientes</span></article><article><strong>{dashboard.data.institutions.length}</strong><span>instituciones</span></article><article><strong>{dashboard.data.relationships.length}</strong><span>vinculaciones</span></article></div><h3>Usuarios</h3>{dashboard.data.users.map((u:any)=><article className="relationship-item" key={u.id}><strong>{u.display_name || u.full_name}</strong><small>{u.role} · {u.created_at?.slice(0,10)}</small></article>)}<h3>Instituciones</h3>{dashboard.data.institutions.map((i:any)=><article className="relationship-item" key={i.id}><strong>{i.name}</strong><small>{i.verification_status} · {i.active ? "Activa" : "Inactiva"}</small></article>)}<h3>Vinculaciones</h3>{dashboard.data.relationships.map((r:any)=><article className="relationship-item" key={r.id}><strong>{r.relationship_label || r.relationship_type}</strong><small>{r.status} · {r.authority_basis}</small></article>)}</>}
          {dashboard?.role === "autistic_person" && <section className="relationship-panel">
            <h3>Privacidad y permisos</h3>
            <p>Revisa qué vinculaciones tienen acceso a tu información. Revocar un permiso corta el acceso compartido correspondiente.</p>
            {consents.length === 0 ? <p className="muted">No hay permisos de seguimiento activos.</p> : consents.map((c:any) => <article className="relationship-item" key={c.id}>
              <strong>Vinculación {String(c.relationship_id).slice(0, 8)}</strong>
              <p>{(c.scopes ?? []).join(" · ")}</p>
              <small>{c.expires_at ? `Expira ${new Date(c.expires_at).toLocaleString()}` : "Sin fecha de expiración"}</small>
              <button className="link" type="button" disabled={consentBusy} onClick={() => void revokeConsent(c.relationship_id)}>Revocar permisos</button>
            </article>)}
          </section>}
          {dashboard?.role === "teacher" && <section className="relationship-panel">
            <h3>Accesos docentes</h3>
            {teacherAccess.length === 0 ? <p className="muted">Todavía no tienes solicitudes de acceso registradas.</p> : teacherAccess.map((a:any) => <article className="relationship-item" key={a.id}>
              <strong>Estudiante {String(a.student_user_id).slice(0, 8)}</strong>
              <p>{(a.scopes ?? []).join(" · ")}</p>
              <small>Estado: {a.status} · Institución: {a.institutional_approval_status} · Plataforma: {a.platform_approval_status}</small>
            </article>)}
          </section>}
          {dashboardMessage && <p role="status">{dashboardMessage}</p>}
        </section>
        {config && <><div className="profile-heading">
          <span className="profile-kicker">ESPACIO PERSONAL</span>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        {accountType === "teacher" && (
          <p className="profile-status">Estado de verificación: <strong>{profile.verification_status ?? "Pendiente"}</strong></p>
        )}
        {loading ? <p className="muted">Cargando tu perfil…</p> : (
          <form className="profile-form" onSubmit={saveProfile}>
            {[...new Set(config.fields.map((field) => field.section))].map((section) => (
              <fieldset className="profile-fieldset" key={section}>
                <legend>{section}</legend>
                {config.fields.filter((field) => field.section === section).map((field) => (
                  <label className="field" key={field.name}>
                    <span>{field.label}</span>
                    {field.kind === "textarea" ? (
                      <textarea value={values[field.name] ?? ""} onChange={(event) => setValues((old) => ({ ...old, [field.name]: event.target.value }))} rows={3} maxLength={2000} />
                    ) : field.kind === "select" ? (
                      <select value={values[field.name] ?? ""} onChange={(event) => setValues((old) => ({ ...old, [field.name]: event.target.value }))}>
                        <option value="">Selecciona una opción</option>
                        {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    ) : (
                      <input value={values[field.name] ?? ""} onChange={(event) => setValues((old) => ({ ...old, [field.name]: event.target.value }))} maxLength={field.name === "institution_email" ? 254 : 2000} />
                    )}
                    <small>{field.help}</small>
                  </label>
                ))}
              </fieldset>
            ))}
            {error && <p className="error" role="alert">{error}</p>}
            {message && <p className="ok" role="status">{message}</p>}
            <button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar perfil"}</button>
          </form>
        )}
        <section className="profile-next-step relationship-panel">
          <h3>Vinculaciones familiares</h3>
          {accountType === "autistic_person" && <>
            <p>Genera un código temporal para que tu familiar pueda solicitar una vinculación. Tú decides si autorizas el acceso al seguimiento.</p>
            <button type="button" disabled={relationshipBusy} onClick={() => void generateInvite()}>{relationshipBusy ? "Procesando…" : "Generar código de vinculación"}</button>
            {inviteCode && <p className="invite-code" aria-live="polite">{inviteCode}<small>Vence: {new Date(inviteExpiry).toLocaleString()}</small></p>}
          </>}
          {accountType === "parent_guardian" && <>
            <p>Introduce el código que te compartió la persona titular. La solicitud no concede acceso hasta su autorización o la verificación legal correspondiente.</p>
            <form className="profile-form" onSubmit={redeemRelationship}>
              <label className="field"><span>Código de invitación</span><input value={redeemCode} onChange={(e) => setRedeemCode(e.target.value.toUpperCase())} maxLength={8} required /></label>
              <label className="field"><span>Tipo de vínculo</span><select value={relationshipType} onChange={(e) => setRelationshipType(e.target.value)}><option value="parent">Padre/madre</option><option value="mother">Madre</option><option value="father">Padre</option><option value="legal_guardian">Tutor legal</option><option value="caregiver">Cuidador</option></select></label>
              <label className="field"><span>Base de autorización</span><select value={authorityBasis} onChange={(e) => setAuthorityBasis(e.target.value)}><option value="subject_consent">Consentimiento de la persona titular</option><option value="legal_representation">Representación legal (requiere verificación)</option></select></label>
              <button type="submit" disabled={relationshipBusy || redeemCode.length !== 8}>Enviar solicitud</button>
            </form>
          </>}
          {relationshipMessage && <p role="status">{relationshipMessage}</p>}
          <h4>Solicitudes y vinculaciones</h4>
          {relationships.length === 0 ? <p className="muted">Todavía no tienes vinculaciones.</p> : relationships.map((item) => {
            const isSubject = item.subject_user_id === session.user.id;
            return <article className="relationship-item" key={item.id}>
              <p><strong>{isSubject ? "Solicitud recibida" : "Solicitud enviada"}</strong> · {item.relationship_type} · {item.status === "active" ? "Activa" : item.status === "pending" ? "Pendiente" : item.status === "rejected" ? "Rechazada" : "Revocada"}</p>
              <small>{item.authority_basis === "legal_representation" ? "Representación legal: pendiente de verificación administrativa." : "Consentimiento de la persona titular."}</small>
              {item.status === "pending" && isSubject && item.authority_basis === "subject_consent" && <div className="relationship-actions"><button type="button" disabled={relationshipBusy} onClick={() => void respondRelationship(item.id, "accept")}>Aceptar</button><button type="button" disabled={relationshipBusy} onClick={() => void respondRelationship(item.id, "reject")}>Rechazar</button></div>}
              {(item.status === "active" || item.status === "pending") && <button className="link" type="button" disabled={relationshipBusy} onClick={() => void respondRelationship(item.id, "revoke")}>Revocar</button>}
            </article>;
          })}
        </section>
        </>}
        <button className="link" type="button" onClick={onLogout}>Cerrar sesión</button>
      </section>
    </AuthShell>
  );
}
