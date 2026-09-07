import React, { useState } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, Pressable, StyleSheet } from "react-native";

const API_BASE = "https://vakalat-api.onrender.com";

export default function App() {
  const [mode, setMode] = useState("home");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [results, setResults] = useState([]);

  async function login() {
    setMessage("Signing in…");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sign in failed");
      setMessage(`Signed in as ${data.user.name}.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function search() {
    setMessage("Searching…");
    try {
      const response = await fetch(`${API_BASE}/professionals/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed");
      setResults(data.results || []);
      setMessage(`${(data.results || []).length} verified professionals found.`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.wrap}>
        <View style={styles.hero}>
          <Text style={styles.logo}>VAKALAT</Text>
          <Text style={styles.tag}>Verified consultation, on record.</Text>
          <Text style={styles.body}>Find verified legal and accounting professionals, sign in, and start your next professional engagement.</Text>
        </View>

        {mode === "home" && (
          <View style={styles.card}>
            <Pressable style={styles.primary} onPress={() => { setMode("login"); setMessage(""); }}>
              <Text style={styles.primaryText}>Sign in</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => { setMode("search"); setMessage(""); }}>
              <Text style={styles.secondaryText}>Find a lawyer or CA</Text>
            </Pressable>
          </View>
        )}

        {mode === "login" && (
          <View style={styles.card}>
            <Text style={styles.title}>Sign in</Text>
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#8992A6" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#8992A6" value={password} onChangeText={setPassword} secureTextEntry />
            <Pressable style={styles.primary} onPress={login}><Text style={styles.primaryText}>Continue</Text></Pressable>
            <Pressable onPress={() => setMode("home")}><Text style={styles.link}>Back</Text></Pressable>
          </View>
        )}

        {mode === "search" && (
          <View style={styles.card}>
            <Text style={styles.title}>Find a professional</Text>
            <TextInput style={styles.input} placeholder="e.g. property lease, GST, audit" placeholderTextColor="#8992A6" value={query} onChangeText={setQuery} />
            <Pressable style={styles.primary} onPress={search}><Text style={styles.primaryText}>Search</Text></Pressable>
            {results.map((person) => (
              <View key={person.id} style={styles.result}>
                <Text style={styles.resultName}>{person.name}</Text>
                <Text style={styles.resultMeta}>{person.profession} · {person.specialization || "General practice"}</Text>
                <Text style={styles.resultMeta}>{[person.city, person.state].filter(Boolean).join(", ")}</Text>
              </View>
            ))}
            <Pressable onPress={() => setMode("home")}><Text style={styles.link}>Back</Text></Pressable>
          </View>
        )}

        {!!message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#10131A" },
  wrap: { flexGrow: 1, justifyContent: "center", maxWidth: 760, width: "100%", alignSelf: "center", padding: 28 },
  hero: { alignItems: "center", marginBottom: 28 },
  logo: { color: "#F7F8FA", fontSize: 38, fontWeight: "700", letterSpacing: 5 },
  tag: { color: "#C7A45B", fontSize: 17, marginTop: 8 },
  body: { color: "#C9CDD8", fontSize: 15, lineHeight: 24, textAlign: "center", maxWidth: 620, marginTop: 18 },
  card: { backgroundColor: "#171B25", borderWidth: 1, borderColor: "#3A4560", borderRadius: 16, padding: 22 },
  title: { color: "#F7F8FA", fontSize: 25, fontWeight: "700", marginBottom: 16 },
  primary: { backgroundColor: "#9B2C2C", paddingVertical: 15, borderRadius: 10, alignItems: "center", marginBottom: 12 },
  primaryText: { color: "#F7F8FA", fontSize: 15, fontWeight: "700" },
  secondary: { borderWidth: 1, borderColor: "#46516A", paddingVertical: 15, borderRadius: 10, alignItems: "center" },
  secondaryText: { color: "#E7E0D2", fontSize: 15, fontWeight: "600" },
  input: { backgroundColor: "#10131A", borderWidth: 1, borderColor: "#3A4560", borderRadius: 9, padding: 13, color: "#F7F8FA", marginBottom: 10, fontSize: 15 },
  link: { color: "#C7A45B", textAlign: "center", marginTop: 12, fontWeight: "600" },
  message: { color: "#C7A45B", textAlign: "center", marginTop: 18 },
  result: { backgroundColor: "#10131A", padding: 14, borderRadius: 10, marginTop: 12 },
  resultName: { color: "#F7F8FA", fontSize: 17, fontWeight: "700" },
  resultMeta: { color: "#C9CDD8", fontSize: 13, marginTop: 4 }
});
