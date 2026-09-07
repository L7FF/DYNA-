import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

const API_BASE = "https://vakalat-api.onrender.com";
const TOKEN_KEY = "vakalat:token";
const USER_KEY = "vakalat:user";

const colors = {
  ink: "#151C2C",
  ink2: "#20293D",
  parchment: "#F3EEE1",
  white: "#FFFFFF",
  seal: "#9C3B2E",
  brass: "#B7924A",
  slate: "#6B7280",
  line: "#E3DCC9",
};

async function api(path, options = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [role, setRole] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("ADVOCATE");
  const [specialization, setSpecialization] = useState("");
  const [query, setQuery] = useState("Property lease review");
  const [results, setResults] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [scope, setScope] = useState("Review and advise on the proposed engagement.");
  const [fee, setFee] = useState("5000");
  const [plans, setPlans] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const rawUser = await AsyncStorage.getItem(USER_KEY);
        if (rawUser) {
          const savedUser = JSON.parse(rawUser);
          setUser(savedUser);
          setRole(savedUser.role);
          setScreen(savedUser.role === "CLIENT" ? "client" : "professional");
        }
      } catch (_) {}
    })();
  }, []);

  async function authenticate() {
    setBusy(true); setStatus("");
    try {
      const path = authMode === "login"
        ? "/auth/login"
        : role === "CLIENT" ? "/auth/signup/client" : "/auth/signup/professional";
      const body = authMode === "login"
        ? { email, password }
        : role === "CLIENT"
          ? { name, email, password }
          : { name, email, password, profession, specialization };
      const data = await api(path, { method: "POST", body: JSON.stringify(body) });
      if (authMode === "login" && data.user.role !== role) {
        throw new Error(`This account is not a ${role === "CLIENT" ? "client" : "professional"} account.`);
      }
      await AsyncStorage.setItem(TOKEN_KEY, data.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setUser(data.user);
      setScreen(data.user.role === "CLIENT" ? "client" : "professional");
      setStatus(`Welcome, ${data.user.name}.`);
    } catch (error) {
      setStatus(error.message);
    } finally { setBusy(false); }
  }

  async function searchProfessionals() {
    setBusy(true); setStatus("");
    try {
      const data = await api(`/professionals/search?q=${encodeURIComponent(query)}`);
      setResults(data.results || []);
      setStatus(`${(data.results || []).length} verified professionals found.`);
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function loadClientAgreements() {
    setBusy(true); setStatus("");
    try {
      const data = await api("/dashboard/client");
      setAgreements(data.agreements || []);
      setScreen("client-dashboard");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function createAgreement() {
    if (!selectedProfessional) return;
    setBusy(true); setStatus("");
    try {
      const data = await api("/agreements", {
        method: "POST",
        body: JSON.stringify({
          professionalId: selectedProfessional.id,
          scope,
          feeInPaise: Math.max(0, Math.round(Number(fee || 0) * 100)),
        }),
      });
      setStatus("Agreement proposed. Your signature is the next step.");
      setSelectedProfessional(null);
      await loadClientAgreements();
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function signAgreement(id) {
    setBusy(true); setStatus("");
    try {
      await api(`/agreements/${id}/sign`, { method: "POST" });
      await loadClientAgreements();
      setStatus("Agreement signed and recorded.");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function loadProfessional() {
    setBusy(true); setStatus("");
    try {
      const [profile, dashboard] = await Promise.all([
        api("/professionals/me"),
        api("/dashboard/professional"),
      ]);
      setAgreements(dashboard.agreements || []);
      setStatus(profile.verified ? "Your profile is verified." : "Your profile is awaiting verification.");
      setScreen("professional");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function loadMembership() {
    setBusy(true); setStatus("");
    try {
      const data = await api("/membership/plans");
      setPlans(data.plans || {});
      setScreen("membership");
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function buyMembership(tier) {
    setBusy(true); setStatus("");
    try {
      const data = await api("/membership/checkout", {
        method: "POST",
        body: JSON.stringify({ tier, provider: "demo" }),
      });
      if (data.paymentId) await api("/membership/confirm", { method: "POST", body: JSON.stringify({ paymentId: data.paymentId }) });
      setStatus(`Membership updated to ${tier}.`);
      await loadProfessional();
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }

  async function signOut() {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null); setRole(null); setScreen("landing"); setStatus("");
  }

  const Button = ({ children, onPress, secondary = false, disabled = false }) => (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabled]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{children}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <View style={styles.seal}><Text style={styles.sealText}>V</Text></View>
          <View><Text style={styles.logo}>VAKALAT</Text><Text style={styles.tagline}>Verified consultation, on record.</Text></View>
        </View>

        {screen === "landing" && (
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Professional help, properly recorded.</Text>
            <Text style={styles.body}>Find verified advocates and chartered accountants, create an agreement, and keep the engagement on record.</Text>
            <Button onPress={() => { setRole("CLIENT"); setAuthMode("login"); setScreen("auth"); }}>I need a lawyer or CA</Button>
            <Button secondary onPress={() => { setRole("PROFESSIONAL"); setAuthMode("login"); setScreen("auth"); }}>I'm a lawyer or CA</Button>
          </View>
        )}

        {screen === "auth" && (
          <View style={styles.card}>
            <Text style={styles.title}>{authMode === "login" ? "Sign in" : "Create your account"}</Text>
            <Text style={styles.sub}>as a {role === "CLIENT" ? "client looking for help" : "verified lawyer or chartered accountant"}</Text>
            {authMode === "signup" && <Field label="Full name" value={name} onChangeText={setName} placeholder="e.g. Priya Sharma" />}
            {authMode === "signup" && role === "PROFESSIONAL" && <>
              <Text style={styles.label}>Profession</Text>
              <View style={styles.choiceRow}>
                <Pressable onPress={() => setProfession("ADVOCATE")} style={[styles.choice, profession === "ADVOCATE" && styles.choiceSelected]}><Text style={styles.choiceText}>Advocate</Text></Pressable>
                <Pressable onPress={() => setProfession("CHARTERED_ACCOUNTANT")} style={[styles.choice, profession === "CHARTERED_ACCOUNTANT" && styles.choiceSelected]}><Text style={styles.choiceText}>Chartered Accountant</Text></Pressable>
              </View>
              <Field label="Specialization" value={specialization} onChangeText={setSpecialization} placeholder="e.g. Property & Real Estate Law" />
            </>}
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@email.com" autoCapitalize="none" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
            {status ? <Text style={styles.message}>{status}</Text> : null}
            <Button onPress={authenticate} disabled={busy}>{busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}</Button>
            <Pressable onPress={() => setAuthMode(authMode === "login" ? "signup" : "login")}><Text style={styles.link}>{authMode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</Text></Pressable>
            <Pressable onPress={() => setScreen("landing")}><Text style={styles.back}>Back</Text></Pressable>
          </View>
        )}

        {screen === "client" && (
          <View style={styles.card}>
            <View style={styles.rowBetween}><Text style={styles.title}>Find help</Text><Pressable onPress={signOut}><Text style={styles.link}>Sign out</Text></Pressable></View>
            <Button secondary onPress={loadClientAgreements}>My agreements</Button>
            <Text style={styles.label}>What do you need help with?</Text>
            <View style={styles.searchRow}><TextInput style={styles.searchInput} value={query} onChangeText={setQuery} placeholder="Property lease, GST, audit…"/><Pressable style={styles.searchButton} onPress={searchProfessionals}><Text style={styles.buttonText}>Search</Text></Pressable></View>
            {status ? <Text style={styles.message}>{status}</Text> : null}
            {busy ? <ActivityIndicator color={colors.seal} style={{ marginTop: 20 }} /> : results.map((p) => <Pressable key={p.id} style={styles.resultCard} onPress={() => setSelectedProfessional(p)}><Text style={styles.resultName}>{p.name}</Text><Text style={styles.resultMeta}>{p.profession === "ADVOCATE" ? "Advocate" : "Chartered Accountant"} · {p.specialization}</Text><Text style={styles.verified}>● Verified</Text><Text style={styles.resultMeta}>{p.yearsExperience || 0} yrs experience · ₹{p.hourlyRate || 0}/hr</Text><Text style={styles.score}>Match score {p.matchScore ?? 0}%</Text></Pressable>)}
            {selectedProfessional && <View style={styles.modalCard}><Text style={styles.title}>Propose agreement</Text><Text style={styles.sub}>{selectedProfessional.name}</Text><Field label="Scope" value={scope} onChangeText={setScope} multiline/><Field label="Agreed fee (₹)" value={fee} onChangeText={setFee} keyboardType="numeric"/><Button onPress={createAgreement} disabled={busy}>Propose agreement</Button><Pressable onPress={() => setSelectedProfessional(null)}><Text style={styles.back}>Cancel</Text></Pressable></View>}
          </View>
        )}

        {screen === "client-dashboard" && (
          <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.title}>My agreements</Text><Pressable onPress={() => setScreen("client")}><Text style={styles.link}>Find help</Text></Pressable></View>{agreements.length === 0 ? <Text style={styles.empty}>No agreements yet.</Text> : agreements.map((a) => <View key={a.id} style={styles.agreement}><Text style={styles.resultName}>{a.professionalName || a.professional_name || "Professional"}</Text><Text style={styles.resultMeta}>{a.scope}</Text><Text style={styles.resultMeta}>₹{((a.feeInPaise || a.fee_in_paise || 0) / 100).toLocaleString("en-IN")} · {a.status}</Text>{a.status !== "SIGNED" && a.status !== "COMPLETED" && <Button onPress={() => signAgreement(a.id)} disabled={busy}>Sign as client</Button>}</View>)}</View>
        )}

        {screen === "professional" && (
          <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.title}>Your practice</Text><Pressable onPress={signOut}><Text style={styles.link}>Sign out</Text></Pressable></View><Text style={styles.body}>Manage engagements and membership from your professional workspace.</Text><Button secondary onPress={loadMembership}>Manage membership</Button><Text style={styles.sectionTitle}>Agreements</Text>{agreements.length === 0 ? <Text style={styles.empty}>No engagements yet.</Text> : agreements.map((a) => <View key={a.id} style={styles.agreement}><Text style={styles.resultName}>{a.clientName || a.client_name || "Client"}</Text><Text style={styles.resultMeta}>{a.scope}</Text><Text style={styles.resultMeta}>₹{((a.feeInPaise || a.fee_in_paise || 0) / 100).toLocaleString("en-IN")} · {a.status}</Text>{a.status === "PENDING" && <Button onPress={async () => { setBusy(true); try { await api(`/agreements/${a.id}/sign`, { method: "POST" }); await loadProfessional(); } catch (e) { setStatus(e.message); } finally { setBusy(false); } }} disabled={busy}>Counter-sign</Button>}</View>)}</View>
        )}

        {screen === "membership" && (
          <View style={styles.card}><View style={styles.rowBetween}><Text style={styles.title}>Membership</Text><Pressable onPress={() => setScreen("professional")}><Text style={styles.link}>Back</Text></Pressable></View><Text style={styles.sub}>Your tier controls visibility in client search.</Text>{status ? <Text style={styles.message}>{status}</Text> : null}{!plans ? <ActivityIndicator color={colors.brass} style={{ marginTop: 30 }} /> : Object.entries(plans).map(([tier, plan]) => <View key={tier} style={styles.plan}><Text style={styles.resultName}>{tier}</Text><Text style={styles.planPrice}>{plan.amountInPaise === 0 ? "Free" : `₹${(plan.amountInPaise / 100).toLocaleString("en-IN")}/mo`}</Text><Text style={styles.resultMeta}>Professional profile visibility and placement.</Text><Button onPress={() => buyMembership(tier)} disabled={busy}>{plan.amountInPaise === 0 ? "Switch to Silver" : "Upgrade"}</Button></View>)}</View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, onChangeText, placeholder, ...props }) {
  return <><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8A8F9E" {...props} /></>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  wrap: { flexGrow: 1, width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, paddingBottom: 48 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 18, marginBottom: 24, gap: 12 },
  seal: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: colors.brass, alignItems: "center", justifyContent: "center" },
  sealText: { color: colors.brass, fontSize: 24, fontWeight: "700" },
  logo: { color: colors.white, fontSize: 28, fontWeight: "700", letterSpacing: 2 },
  tagline: { color: "#C9CDD8", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  heroCard: { backgroundColor: colors.ink2, borderWidth: 1, borderColor: "#3A4560", borderRadius: 16, padding: 24 },
  heroTitle: { color: colors.white, fontSize: 28, lineHeight: 34, fontWeight: "700", marginBottom: 12 },
  body: { color: "#C9CDD8", fontSize: 14, lineHeight: 21, marginBottom: 18 },
  card: { backgroundColor: colors.parchment, borderRadius: 14, padding: 20 },
  modalCard: { backgroundColor: "#FBF9F3", borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 16, marginTop: 16 },
  title: { color: colors.ink, fontSize: 23, fontWeight: "700" },
  sub: { color: colors.slate, fontSize: 12.5, marginTop: 4, marginBottom: 12, fontStyle: "italic" },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "700", marginTop: 20, marginBottom: 10 },
  label: { color: colors.slate, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 5 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontSize: 14 },
  button: { backgroundColor: colors.seal, borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  secondaryButton: { backgroundColor: "transparent", borderWidth: 1, borderColor: colors.seal },
  buttonText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  secondaryButtonText: { color: colors.seal },
  disabled: { opacity: 0.55 },
  link: { color: colors.seal, fontSize: 12, fontWeight: "600" },
  back: { color: colors.slate, textAlign: "center", marginTop: 14, fontSize: 12 },
  message: { color: colors.seal, marginTop: 12, fontSize: 12.5, lineHeight: 18 },
  choiceRow: { flexDirection: "row", gap: 8 },
  choice: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  choiceSelected: { borderColor: colors.brass, backgroundColor: "#F8F1DF" },
  choiceText: { color: colors.ink, fontSize: 12 },
  searchRow: { flexDirection: "row", gap: 8 },
  searchInput: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink },
  searchButton: { backgroundColor: colors.seal, borderRadius: 8, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  resultCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 11, padding: 15, marginTop: 10 },
  resultName: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  resultMeta: { color: colors.slate, fontSize: 12, marginTop: 3, lineHeight: 17 },
  verified: { color: colors.seal, fontSize: 11, fontWeight: "700", marginTop: 6 },
  score: { color: colors.brass, fontSize: 11, fontWeight: "700", marginTop: 6 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  agreement: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 14, marginTop: 10 },
  plan: { backgroundColor: colors.ink2, borderWidth: 1, borderColor: "#3A4560", borderRadius: 11, padding: 16, marginTop: 10 },
  planPrice: { color: colors.brass, fontSize: 20, fontWeight: "700", marginTop: 4 },
  empty: { color: colors.slate, textAlign: "center", marginTop: 24 },
});
