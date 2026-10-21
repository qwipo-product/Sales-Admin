import { Injectable } from '@angular/core';
import * as turf from '@turf/turf';

/**
 * Minified as `Q0` in chunk 35; injected as `polygonService` by SalesPersonAreasComponent.
 *
 * The bundle contains @turf/turf 6.5.x (whole barrel imported -> every CJS dependency of turf is kept
 * as a side-effect require). Only turf.polygon (helpers), turf.booleanEqual and turf.booleanOverlap are
 * actually used; booleanOverlap was inlined by the optimizer into arePolygonsOverlapping.
 *
 * Both rings must be GeoJSON rings of [longitude, latitude] positions (SalesPersonAreasComponent converts the
 * stored { latitude, longitude } points with toGeoJsonRing; uploaded GeoJSON rings are passed as they are).
 * turf.polygon throws if a ring has < 4 positions or is not closed (first !== last).
 */
@Injectable({
  providedIn: 'root',
})
export class PolygonService {
  constructor() {}

  /**
   * true if the two rings are equal (precision 6), partially overlap, or one lies completely inside the other.
   * (The original only used booleanEqual + booleanOverlap, and booleanOverlap is false for containment, so a new
   * area drawn entirely inside an existing one was accepted.) Areas that merely share a border are not overlapping.
   */
  arePolygonsOverlapping(polygon1Coordinates: number[][], polygon2Coordinates: number[][]): boolean {
    const polygon1 = turf.polygon([polygon1Coordinates]);
    const polygon2 = turf.polygon([polygon2Coordinates]);
    return (
      turf.booleanEqual(polygon1, polygon2) ||
      turf.booleanOverlap(polygon1, polygon2) ||
      turf.booleanContains(polygon1, polygon2) ||
      turf.booleanContains(polygon2, polygon1)
    );
  }

  /** true if both rings describe the same polygon (turf.booleanEqual, precision 6, after cleanCoords). */
  arePolygonsSame(polygon1Coordinates: number[][], polygon2Coordinates: number[][]): boolean {
    const polygon1 = turf.polygon([polygon1Coordinates]);
    const polygon2 = turf.polygon([polygon2Coordinates]);
    return turf.booleanEqual(polygon1, polygon2);
  }
}
