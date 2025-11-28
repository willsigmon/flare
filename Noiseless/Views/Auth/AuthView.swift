import SwiftUI
import AuthenticationServices
import CryptoKit
#if canImport(SafariServices)
import SafariServices
#endif

/// Authentication view with Apple Sign-In and Google Sign-In
struct AuthView: View {
    @Environment(SupabaseService.self) private var supabase
    @State private var currentNonce: String?
    @State private var errorMessage: String?
    @State private var isShowingEmailSignIn = false
    @State private var isGoogleSignInLoading = false

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Logo and tagline
            VStack(spacing: 16) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(.orange.gradient)

                Text("Flare")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Your personal intelligence feed")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Sign in buttons
            VStack(spacing: 12) {
                SignInWithAppleButton(.signIn) { request in
                    let nonce = randomNonceString()
                    currentNonce = nonce
                    request.requestedScopes = [.email, .fullName]
                    request.nonce = sha256(nonce)
                } onCompletion: { result in
                    Task {
                        await handleAppleSignIn(result)
                    }
                }
                .signInWithAppleButtonStyle(.white)
                .frame(height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 10))

                Button {
                    Task { await handleGoogleSignIn() }
                } label: {
                    HStack(spacing: 8) {
                        if isGoogleSignInLoading {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Image(systemName: "g.circle.fill")
                                .font(.title2)
                            Text("Sign in with Google")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(.white)
                    .foregroundStyle(.black)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(isGoogleSignInLoading)

                Button {
                    isShowingEmailSignIn = true
                } label: {
                    HStack {
                        Image(systemName: "envelope.fill")
                        Text("Sign in with Email")
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(.secondary.opacity(0.2))
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 32)

            if let error = errorMessage {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            #if DEBUG
            Button {
                supabase.enableDevMode()
            } label: {
                Text("Skip Auth (Dev Only)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 8)
            #endif

            Spacer()
                .frame(height: 50)
        }
        .sheet(isPresented: $isShowingEmailSignIn) {
            EmailSignInView()
        }
    }

    // MARK: - Apple Sign In

    private func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let idTokenData = appleIDCredential.identityToken,
                  let idToken = String(data: idTokenData, encoding: .utf8),
                  let nonce = currentNonce else {
                errorMessage = "Failed to get Apple ID credentials"
                return
            }

            do {
                try await supabase.signInWithApple(idToken: idToken, nonce: nonce)
                errorMessage = nil
            } catch {
                errorMessage = "Sign in failed: \(error.localizedDescription)"
            }

        case .failure(let error):
            // Don't show error for user cancellation
            if (error as NSError).code != ASAuthorizationError.canceled.rawValue {
                errorMessage = "Apple Sign In failed: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Google Sign In

    private func handleGoogleSignIn() async {
        isGoogleSignInLoading = true
        errorMessage = nil

        do {
            let url = try await supabase.getGoogleOAuthURL()

            #if os(iOS)
            await openGoogleSignInOnIOS(url: url)
            #else
            await openGoogleSignInOnMac(url: url)
            #endif
        } catch {
            errorMessage = "Google Sign In failed: \(error.localizedDescription)"
            isGoogleSignInLoading = false
        }
    }

    #if os(iOS)
    @MainActor
    private func openGoogleSignInOnIOS(url: URL) async {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first,
              let rootVC = window.rootViewController else {
            errorMessage = "Could not find root view controller"
            isGoogleSignInLoading = false
            return
        }

        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: "flare"
        ) { callbackURL, error in
            Task { @MainActor in
                await handleOAuthCallback(callbackURL: callbackURL, error: error)
            }
        }

        session.presentationContextProvider = WebAuthContextProvider(anchor: window)
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }
    #else
    @MainActor
    private func openGoogleSignInOnMac(url: URL) async {
        guard let window = NSApplication.shared.keyWindow else {
            errorMessage = "Could not find key window"
            isGoogleSignInLoading = false
            return
        }

        let session = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: "flare"
        ) { callbackURL, error in
            Task { @MainActor in
                await handleOAuthCallback(callbackURL: callbackURL, error: error)
            }
        }

        session.presentationContextProvider = WebAuthContextProvider(anchor: window)
        session.prefersEphemeralWebBrowserSession = false
        session.start()
    }
    #endif

    @MainActor
    private func handleOAuthCallback(callbackURL: URL?, error: Error?) async {
        defer { isGoogleSignInLoading = false }

        if let error = error {
            // Don't show error for user cancellation
            if (error as NSError).code != ASWebAuthenticationSessionError.canceledLogin.rawValue {
                errorMessage = "Google Sign In failed: \(error.localizedDescription)"
            }
            return
        }

        guard let callbackURL = callbackURL else {
            errorMessage = "No callback URL received"
            return
        }

        do {
            try await supabase.handleOAuthCallback(url: callbackURL)
            errorMessage = nil
        } catch {
            errorMessage = "Failed to complete sign in: \(error.localizedDescription)"
        }
    }
}

// MARK: - Web Auth Context Provider

#if os(iOS)
private class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: UIWindow

    init(anchor: UIWindow) {
        self.anchor = anchor
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}
#else
private class WebAuthContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    private let anchor: NSWindow

    init(anchor: NSWindow) {
        self.anchor = anchor
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        anchor
    }
}
#endif

// MARK: - Email Sign In Sheet

struct EmailSignInView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SupabaseService.self) private var supabase

    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Email", text: $email)
                        .textContentType(.emailAddress)
                        .autocorrectionDisabled()
                        #if os(iOS)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        #endif

                    SecureField("Password", text: $password)
                        .textContentType(isSignUp ? .newPassword : .password)
                }

                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button {
                        Task { await performAuth() }
                    } label: {
                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text(isSignUp ? "Create Account" : "Sign In")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .disabled(email.isEmpty || password.isEmpty || isLoading)
                }

                Section {
                    Button {
                        isSignUp.toggle()
                        errorMessage = nil
                    } label: {
                        Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                            .font(.caption)
                            .frame(maxWidth: .infinity)
                    }
                }
            }
            .navigationTitle(isSignUp ? "Create Account" : "Sign In")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func performAuth() async {
        isLoading = true
        errorMessage = nil

        do {
            if isSignUp {
                try await supabase.signUp(email: email, password: password)
            } else {
                try await supabase.signIn(email: email, password: password)
            }
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

// MARK: - Crypto Helpers

/// Generate a random nonce for Apple Sign In
private func randomNonceString(length: Int = 32) -> String {
    precondition(length > 0)
    var randomBytes = [UInt8](repeating: 0, count: length)
    let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
    if errorCode != errSecSuccess {
        fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
    }

    let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
    let nonce = randomBytes.map { byte in
        charset[Int(byte) % charset.count]
    }

    return String(nonce)
}

/// SHA256 hash of input string
private func sha256(_ input: String) -> String {
    let inputData = Data(input.utf8)
    let hashedData = SHA256.hash(data: inputData)
    return hashedData.compactMap { String(format: "%02x", $0) }.joined()
}

#Preview {
    AuthView()
        .environment(SupabaseService.shared)
}
