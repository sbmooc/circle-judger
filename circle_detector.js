class CircleDetector {
    constructor() {
        this.EARTH_RADIUS = 6371; // Earth's radius in kilometers
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
        const φ1 = this.toRadians(lat1);
        const φ2 = this.toRadians(lat2);
        const Δφ = this.toRadians(lat2 - lat1);
        const Δλ = this.toRadians(lon2 - lon1);

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return this.EARTH_RADIUS * c;
    }

    getCirclePoints(centerLat, centerLon, radiusKm, points = 100) {
        const coordinates = [];
        for (let i = 0; i <= points; i++) {
            const angle = (2 * Math.PI * i) / points;
            
            // Using approximation valid for small distances
            const lat = centerLat + (radiusKm / 111.32) * Math.cos(angle);
            const lon = centerLon + (radiusKm / (111.32 * Math.cos(this.toRadians(centerLat)))) * Math.sin(angle);
            
            coordinates.push([lat, lon]);
        }
        return coordinates;
    }

    analyzeTrack(points, { tolerance = 0.1, radiusVarianceThreshold = 0.2 } = {}) {
        if (points.length < 3) {
            return {
                isCircular: false,
                details: { error: "Not enough points" }
            };
        }

        // Check if start and end points are close
        const startPoint = points[0];
        const endPoint = points[points.length - 1];

        const startEndDistance = this.haversineDistance(
            startPoint.lat, startPoint.lon,
            endPoint.lat, endPoint.lon
        );

        if (startEndDistance > tolerance) {
           return {
               isCircular: false,
               details: {
                   error: "Start and end points too far apart",
                   distance: startEndDistance
               }
           };
        }

        // Calculate center point
        const centerLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
        const centerLon = points.reduce((sum, p) => sum + p.lon, 0) / points.length;

        // Calculate distances from center to all points
        const radii = points.map(p => 
            this.haversineDistance(centerLat, centerLon, p.lat, p.lon)
        );

        // Check if radii are relatively consistent
        const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
        const maxRadiusDiff = Math.max(...radii.map(r => Math.abs(r - avgRadius)));

        const isCircular = maxRadiusDiff / avgRadius <= radiusVarianceThreshold;

        // Generate circle boundaries
        const perfectCircle = this.getCirclePoints(centerLat, centerLon, avgRadius);
        const innerCircle = this.getCirclePoints(centerLat, centerLon, avgRadius * (1 - tolerance));
        const outerCircle = this.getCirclePoints(centerLat, centerLon, avgRadius * (1 + tolerance));

        return {
            isCircular,
            details: {
                averageRadius: avgRadius,
                radiusVariance: maxRadiusDiff / avgRadius,
                startEndDistance: startEndDistance,
                center: [centerLat, centerLon]
            },
            circles: {
                perfect: perfectCircle,
                inner: innerCircle,
                outer: outerCircle
            }
        };
    }
} 