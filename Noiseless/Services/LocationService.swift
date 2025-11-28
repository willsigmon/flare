import Foundation
import CoreLocation

/// Service for managing user location for local content
@MainActor
@Observable
final class LocationService: NSObject {
    static let shared = LocationService()

    // MARK: - State

    private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined
    private(set) var currentLocation: CLLocation?
    private(set) var currentCity: String?
    private(set) var currentState: String?
    private(set) var currentCountry: String?
    private(set) var isLoading = false
    private(set) var error: Error?

    // MARK: - Private

    private let locationManager = CLLocationManager()
    private let geocoder = CLGeocoder()
    private var locationContinuation: CheckedContinuation<CLLocation?, Never>?

    // MARK: - Init

    private override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyKilometer
        authorizationStatus = locationManager.authorizationStatus
    }

    // MARK: - Public Methods

    /// Request location permission
    func requestPermission() {
        locationManager.requestWhenInUseAuthorization()
    }

    /// Get current location (async)
    func getCurrentLocation() async -> CLLocation? {
        guard authorizationStatus == .authorizedWhenInUse ||
              authorizationStatus == .authorizedAlways else {
            return nil
        }

        isLoading = true
        defer { isLoading = false }

        return await withCheckedContinuation { continuation in
            self.locationContinuation = continuation
            locationManager.requestLocation()
        }
    }

    /// Refresh location and reverse geocode
    func refreshLocation() async {
        guard let location = await getCurrentLocation() else { return }

        currentLocation = location
        await reverseGeocode(location)
    }

    /// Get the local subreddit name based on current location
    var localSubreddit: String? {
        // Try city first, then state
        if let city = currentCity {
            // Common city subreddits
            let cityName = city.lowercased()
                .replacingOccurrences(of: " ", with: "")
                .replacingOccurrences(of: ".", with: "")
            return cityName
        } else if let state = currentState {
            return state.lowercased()
        }
        return nil
    }

    /// Get local subreddit options (city + state)
    var localSubreddits: [String] {
        var subreddits: [String] = []

        if let city = currentCity {
            let cityName = city.lowercased()
                .replacingOccurrences(of: " ", with: "")
                .replacingOccurrences(of: ".", with: "")
            subreddits.append(cityName)
        }

        if let state = currentState {
            subreddits.append(state.lowercased())
        }

        return subreddits
    }

    /// Display name for local section
    var localDisplayName: String {
        if let city = currentCity {
            return city
        } else if let state = currentState {
            return state
        }
        return "Your Area"
    }

    // MARK: - Private Methods

    private func reverseGeocode(_ location: CLLocation) async {
        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            if let placemark = placemarks.first {
                currentCity = placemark.locality
                currentState = placemark.administrativeArea
                currentCountry = placemark.country
            }
        } catch {
            print("Geocoding error: \(error)")
            self.error = error
        }
    }
}

// MARK: - CLLocationManagerDelegate

extension LocationService: CLLocationManagerDelegate {
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in
            if let location = locations.last {
                self.currentLocation = location
                self.locationContinuation?.resume(returning: location)
                self.locationContinuation = nil
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            self.error = error
            self.locationContinuation?.resume(returning: nil)
            self.locationContinuation = nil
        }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorizationStatus = status
        }
    }
}
