import { StatusBar } from "expo-status-bar";
import { useRef, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

// The deployed Firebreak web app -- this wrapper's only job is to load it
// natively so it can be demoed through Expo Go. Everything else (AQI, the
// map, symptom checklist, Ask assistant, location picker) is the exact same
// app already built and deployed at this URL, not reimplemented here.
const APP_URL = "https://firebreak-beta.vercel.app";

export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [hasError, setHasError] = useState(false);

  function retry() {
    setHasError(false);
    webviewRef.current?.reload();
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        {hasError ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Couldn&apos;t reach Firebreak. Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retry}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: APP_URL }}
            style={styles.webview}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" color="#ff2e93" />
              </View>
            )}
            onError={() => setHasError(true)}
            onHttpError={() => setHasError(true)}
            // Sky-photo upload uses a file input with capture="environment" and
            // the dashboard/map use browser geolocation -- both need these on.
            geolocationEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            pullToRefreshEnabled={Platform.OS === "android"}
            originWhitelist={["https://*"]}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#120b1e", // matches the web app's dark background so the native chrome doesn't flash white
  },
  webview: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    color: "#fdf6ff",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: {
    color: "#111827",
    fontWeight: "600",
  },
});
