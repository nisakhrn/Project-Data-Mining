import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Peta Satuan dan Tipe Angka Otomatis Berdasarkan Indikator
const METADATA_INDIKATOR = {
  "Jumlah Murid SD": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMP": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMA": { satuan: "murid", tipe: "jumlah" },
  "Jumlah Murid SMK": { satuan: "murid", tipe: "jumlah" },
  "Rata-rata Lama Sekolah": { satuan: "tahun", tipe: "desimal" },
  "Harapan Lama Sekolah": { satuan: "tahun", tipe: "desimal" },
  "Angka Melek Huruf": { satuan: "%", tipe: "desimal" }
};

// Parameter Model Regresi Skenario C
const MODEL_REGRESI = {
  "Jumlah Murid SD": { slope: 421.42, intercept: -118224.28, r2: 0.027, historisTerakhir: { tahun: 2025, nilai: 998112 } },
  "Jumlah Murid SMP": { slope: 3700.81, intercept: -7070104.97, r2: 0.684, historisTerakhir: { tahun: 2025, nilai: 424076 } },
  "Jumlah Murid SMA": { slope: 1062.82, intercept: -1872167.31, r2: 0.131, historisTerakhir: { tahun: 2025, nilai: 285654 } },
  "Jumlah Murid SMK": { slope: 648.14, intercept: -1199343.89, r2: 0.223, historisTerakhir: { tahun: 2025, nilai: 114528 } },
  "Rata-rata Lama Sekolah": { slope: 0.10, intercept: -193.30, r2: 0.979, historisTerakhir: { tahun: 2024, nilai: 9.74 } },
  "Harapan Lama Sekolah": { slope: 0.08, intercept: -151.72, r2: 0.987, historisTerakhir: { tahun: 2024, nilai: 14.75 } },
  "Angka Melek Huruf": { slope: 0.06, intercept: -28.08, r2: 0.960, historisTerakhir: { tahun: 2024, nilai: 98.21 } }
};

export default function ProyeksiInteraktif() {
  const [variabelAktif, setVariabelAktif] = useState("Harapan Lama Sekolah");
  const [tahunTarget, setTahunTarget] = useState(2031);

  const meta = METADATA_INDIKATOR[variabelAktif] || { satuan: "", tipe: "desimal" };
  const model = MODEL_REGRESI[variabelAktif];

  // Hitung Nilai Estimasi
  const estimasiNilai = useMemo(() => {
    if (!model) return 0;
    const hasil = model.slope * tahunTarget + model.intercept;
    return meta.tipe === "jumlah" ? Math.round(hasil) : hasil;
  }, [variabelAktif, tahunTarget, model, meta]);

  // Format Angka Rapi (pembatas ribuan untuk murid, desimal untuk tahun/persen)
  const formatAngka = (val) => {
    if (typeof val !== 'number' || !Number.isFinite(val)) return val;
    if (meta.tipe === "jumlah") {
      return new Intl.NumberFormat('id-ID').format(Math.round(val));
    }
    return val.toFixed(2).replace('.', ',');
  };

  // Data Seri Grafik
  const dataGrafik = useMemo(() => {
    if (!model) return [];
    const titik = [];
    const tahunAwal = 2016;
    const tahunAkhir = Math.max(2034, tahunTarget);

    for (let t = tahunAwal; t <= tahunAkhir; t++) {
      const pred = model.slope * t + model.intercept;
      titik.push({
        tahun: t,
        nilai: meta.tipe === "jumlah" ? Math.round(pred) : Number(pred.toFixed(2)),
        isTarget: t === tahunTarget
      });
    }
    return titik;
  }, [model, tahunTarget, meta]);

  return (
    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e8ebf0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1f2a3f' }}>🎛️ Proyeksi Interaktif</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#657188' }}>
            Simulasi estimasi nilai indikator berdasarkan tren regresi BPS.
          </p>
        </div>
        <span style={{ background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', color: '#475569', fontWeight: 500 }}>
          Geser slider untuk simulasi tahun
        </span>
      </div>

      {/* PILIHAN INDIKATOR & SLIDER TAHUN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px', marginBottom: '24px', alignItems: 'center' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Pilih Indikator:
          </label>
          <select 
            value={variabelAktif} 
            onChange={(e) => setVariabelAktif(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          >
            {Object.keys(MODEL_REGRESI).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Tahun Target Proyeksi:</label>
            <span style={{ fontWeight: 700, color: '#eb2b39', fontSize: '1rem' }}>{tahunTarget}</span>
          </div>
          <input 
            type="range" 
            min="2025" 
            max="2034" 
            value={tahunTarget} 
            onChange={(e) => setTahunTarget(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#eb2b39', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
            <span>2025</span>
            <span>2034</span>
          </div>
        </div>
      </div>

      {/* KARDUS RINGKASAN / SUMMARY CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* KARDUS ESTIMASI DENGAN LABELLING SATUAN TEGAS */}
        <div style={{ background: '#fff5f5', border: '1.5px solid #fecdd3', padding: '16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Estimasi {variabelAktif} ({tahunTarget})
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: '#eb2b39', lineHeight: 1 }}>
              {formatAngka(estimasiNilai)}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#be123c' }}>
              {meta.satuan}
            </span>
          </div>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#881337' }}>
            *Nilai proyeksi berdasarkan tren regresi linear.
          </p>
        </div>

        {/* AKURASI MODEL (R²) */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Akurasi Model (R²)</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {model.r2.toFixed(3)}
          </div>
          <span style={{ fontSize: '0.75rem', color: model.r2 > 0.6 ? '#16a34a' : '#d97706', fontWeight: 600 }}>
            {model.r2 > 0.8 ? '● Tren Sangat Kuat' : model.r2 > 0.5 ? '● Tren Cukup Konsisten' : '▲ Fluktuatif (Indikasi)'}
          </span>
        </div>

        {/* DATA TERAKHIR BPS */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Data Historis Terakhir</span>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
            {formatAngka(model.historisTerakhir.nilai)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>{meta.satuan}</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tahun {model.historisTerakhir.tahun} (BPS Aceh)</span>
        </div>
      </div>

      {/* GRAFIK SIMULASI */}
      <div style={{ height: '300px', width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dataGrafik} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="tahun" tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={formatAngka} domain={['auto', 'auto']} />
            <Tooltip 
              formatter={(value) => [`${formatAngka(value)} ${meta.satuan}`, variabelAktif]}
              labelFormatter={(label) => `Tahun: ${label}`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="nilai" 
              name={`Garis Tren (${meta.satuan})`} 
              stroke="#2563eb" 
              strokeWidth={2.5} 
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.tahun === tahunTarget) {
                  return <circle key={cx} cx={cx} cy={cy} r={6} fill="#eb2b39" stroke="#fff" strokeWidth={2} />;
                }
                return <circle key={cx} cx={cx} cy={cy} r={2} fill="#2563eb" />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}