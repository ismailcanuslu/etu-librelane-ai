/** Minimal GDSII BOUNDARY okuyucu — katman önizlemesi için */

export type GdsPolygon = {
  layer: number;
  datatype: number;
  points: { x: number; y: number }[];
};

export type ParsedGds = {
  polygons: GdsPolygon[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
};

function readInt16(dv: DataView, offset: number, bigEndian: boolean): number {
  return dv.getInt16(offset, !bigEndian);
}

function readInt32(dv: DataView, offset: number, bigEndian: boolean): number {
  return dv.getInt32(offset, !bigEndian);
}

export function parseGdsBuffer(buffer: ArrayBuffer, maxRecords = 8000): ParsedGds {
  const dv = new DataView(buffer);
  const polygons: GdsPolygon[] = [];
  let offset = 0;
  let layer = 0;
  let datatype = 0;
  let pendingXY: number[] | null = null;

  while (offset + 4 <= dv.byteLength && polygons.length < maxRecords) {
    const recordSize = dv.getUint16(offset, false) * 2;
    if (recordSize < 4) break;
    const recordType = dv.getUint16(offset + 2, false);
    const dataStart = offset + 4;
    const bigEndian = true;

    if (recordType === 0x0d02) {
      if (recordSize >= 6) layer = readInt16(dv, dataStart, bigEndian);
    } else if (recordType === 0x0e02) {
      if (recordSize >= 6) datatype = readInt16(dv, dataStart, bigEndian);
    } else if (recordType === 0x1003) {
      // XY
      const count = (recordSize - 4) / 4;
      const xy: number[] = [];
      for (let i = 0; i < count; i++) {
        xy.push(readInt32(dv, dataStart + i * 4, bigEndian));
      }
      pendingXY = xy;
    } else if (recordType === 0x1100 && pendingXY && pendingXY.length >= 6) {
      const pts: { x: number; y: number }[] = [];
      for (let i = 0; i + 1 < pendingXY.length; i += 2) {
        pts.push({ x: pendingXY[i], y: pendingXY[i + 1] });
      }
      if (pts.length >= 3) {
        polygons.push({ layer, datatype, points: pts });
      }
      pendingXY = null;
    }

    offset += recordSize;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of polygons) {
    for (const p of poly.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  const bounds =
    polygons.length > 0
      ? { minX, minY, maxX, maxY }
      : null;

  return { polygons, bounds };
}
