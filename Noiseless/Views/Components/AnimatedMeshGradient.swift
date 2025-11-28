import SwiftUI

/// Animated mesh gradient background for onboarding and discovery
struct AnimatedMeshGradient: View {
    @State private var animationPhase: CGFloat = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1/30)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate

            MeshGradient(
                width: 3,
                height: 3,
                points: animatedPoints(time: time),
                colors: [
                    .blue.opacity(0.8),
                    .purple.opacity(0.7),
                    .indigo.opacity(0.8),

                    .cyan.opacity(0.6),
                    .mint.opacity(0.5),
                    .blue.opacity(0.7),

                    .indigo.opacity(0.7),
                    .purple.opacity(0.6),
                    .pink.opacity(0.7)
                ],
                smoothsColors: true
            )
        }
        .ignoresSafeArea()
    }

    private func animatedPoints(time: Double) -> [SIMD2<Float>] {
        let speed: Double = 0.3

        return [
            // Top row
            SIMD2<Float>(0, 0),
            SIMD2<Float>(0.5 + Float(sin(time * speed) * 0.1), Float(cos(time * speed * 0.7) * 0.1)),
            SIMD2<Float>(1, 0),

            // Middle row
            SIMD2<Float>(Float(cos(time * speed * 0.8) * 0.1), 0.5 + Float(sin(time * speed) * 0.1)),
            SIMD2<Float>(0.5 + Float(sin(time * speed * 1.2) * 0.15), 0.5 + Float(cos(time * speed) * 0.15)),
            SIMD2<Float>(1 + Float(sin(time * speed * 0.9) * 0.1), 0.5),

            // Bottom row
            SIMD2<Float>(0, 1),
            SIMD2<Float>(0.5 + Float(cos(time * speed * 0.6) * 0.1), 1 + Float(sin(time * speed * 0.8) * 0.05)),
            SIMD2<Float>(1, 1)
        ]
    }
}

/// Subtle animated gradient for cards and backgrounds
struct SubtleMeshGradient: View {
    let baseColor: Color

    var body: some View {
        TimelineView(.animation(minimumInterval: 1/20)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate

            MeshGradient(
                width: 2,
                height: 2,
                points: subtlePoints(time: time),
                colors: [
                    baseColor.opacity(0.3),
                    baseColor.opacity(0.5),
                    baseColor.opacity(0.4),
                    baseColor.opacity(0.6)
                ],
                smoothsColors: true
            )
        }
    }

    private func subtlePoints(time: Double) -> [SIMD2<Float>] {
        let speed: Double = 0.5
        return [
            SIMD2<Float>(0, 0),
            SIMD2<Float>(1 + Float(sin(time * speed) * 0.05), Float(cos(time * speed) * 0.05)),
            SIMD2<Float>(Float(sin(time * speed * 0.8) * 0.05), 1),
            SIMD2<Float>(1, 1 + Float(cos(time * speed * 0.7) * 0.05))
        ]
    }
}

#Preview {
    AnimatedMeshGradient()
}
