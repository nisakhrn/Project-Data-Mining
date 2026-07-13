import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot,
  ResponsiveContainer
} from 'recharts';

const formatNama = (kunci) => kunci.replace(/_/g, ' ');

const formatAngka = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value);
};

const labelKualitasModel = (r2) => {
  if (r2 >= 0.7) return { teks: 'Tren kuat & dapat diandalkan', warna: '#1a9e5c' };
  if (r2 >= 0.4) return { teks: 'Tren cukup, gunakan dengan catatan', warna: '#c98a13' };
  return { teks: 'Tren lemah, hanya indikatif', warna: '#c94040' };
};

export default function ProyeksiInteraktif() {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  const [variabelAktif, setVariabelAktif] = useState('');
  const [tahunTarget, setTahunTarget] = useState(2027);

  useEffect(() => {
    fetch('/data/regresi/model_regresi_skenario_c.json')
      .then((res) => {
        if (!res.ok) throw new Error('File model tidak ditemukan');
        return res.json();
      })
      .then((data) => {
        setModel(data);
        const kunciPertama = Object.keys(data)[0];
        setVariabelAktif(kunciPertama);
        const tahunAwal = (data[kunciPertama]?.tahun_terakhir_data ?? 2024) + 1;
        setTahunTarget(tahunAwal);
      })
      .catch((err) => setError(err.message));
  }, []);

  const info = model && variabelAktif ? model[variabelAktif] : null;

  const batasTahun = useMemo(() => {
    if (!info) return { min: 2025, max: 2030 };
    return { min: info.tahun_terakhir_data + 1, max: info.tahun_terakhir_data + 10 };
  }, [info]);

  const hasilProyeksi = useMemo(() => {
    if (!info) return null;
    return info.slope * tahunTarget + info.intercept;
  }, [info, tahunTarget]);

  const dataGrafik = useMemo(() => {
    if (!info) return [];
    const titik = [];
    const tahunMulai = info.tahun_terakhir_data - 8;
    for (let t = tahunMulai; t <= batasTahun.max; t += 1) {
      titik.push({ tahun: t, nilai: info.slope * t + info.intercept });
    }
    return titik;
  }, [info, batasTahun]);

  if (error) {
    return (
      <div className="chart-card">
        <p>Gagal memuat model proyeksi: {error}</p>
        <p style={{ fontSize: 12, color: '#8a93a6' }}>
          Pastikan file <code>model_regresi_skenario_c.json</code> ada di <code>public/data/regresi/</code>.
        </p>
      </div>
    );
  }

  if (!model) {
    return <div className="chart-card"><p>Memuat model proyeksi...</p></div>;
  }

  const kualitas = info ? labelKualitasModel(info.r2) : null;

  return (
    <article className="chart-card">
      <header className="chart-header">
        <h3>Proyeksi Interaktif</h3>
        <span className="chart-tag">Geser tahun untuk hitung ulang</span>
      </header>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label htmlFor="pilih-variabel-interaktif" style={{ fontSize: 13, color: '#657188' }}>
          Variabel:
        </label>
        <select
          id="pilih-variabel-interaktif"
          value={variabelAktif}
          onChange={(e) => setVariabelAktif(e.target.value)}
        >
          {Object.keys(model).map((kunci) => (
            <option key={kunci} value={kunci}>{formatNama(kunci)}</option>
          ))}
        </select>
      </div>

      {info && (
        <>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="slider-tahun" style={{ fontSize: 13, color: '#657188', display: 'block', marginBottom: 6 }}>
              Tahun target: <strong>{tahunTarget}</strong>
            </label>
            <input
              id="slider-tahun"
              type="range"
              min={batasTahun.min}
              max={batasTahun.max}
              value={tahunTarget}
              onChange={(e) => setTahunTarget(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9aa3b5' }}>
              <span>{batasTahun.min}</span>
              <span>{batasTahun.max}</span>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginBottom: 16 }}>
            <article className="kpi-card accent">
              <span>Estimasi {formatNama(variabelAktif)} ({tahunTarget})</span>
              <strong>{formatAngka(hasilProyeksi)}</strong>
            </article>
            <article className="kpi-card">
              <span>{'R\u00b2 Model'}</span>
              <strong>{info.r2.toFixed(3)}</strong>
              <small style={{ color: kualitas.warna }}>{kualitas.teks}</small>
            </article>
            <article className="kpi-card">
              <span>Data Historis Terakhir</span>
              <strong>{info.tahun_terakhir_data}</strong>
            </article>
          </div>

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataGrafik} margin={{ top: 16, right: 24, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#ebeef3" />
                <XAxis dataKey="tahun" tick={{ fill: '#657188' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#657188' }} axisLine={false} tickLine={false} tickFormatter={formatAngka} />
                <Tooltip formatter={formatAngka} contentStyle={{ borderRadius: '10px', borderColor: '#e8ebf0' }} />
                <Line type="monotone" dataKey="nilai" stroke="#2a78d6" strokeWidth={2} dot={false} />
                <ReferenceDot x={tahunTarget} y={hasilProyeksi} r={6} fill="#eb2b39" stroke="none" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {info.r2 < 0.4 && (
            <p style={{ fontSize: 12, color: '#c94040', marginTop: 8 }}>
                Catatan: nilai {'R\u00b2'} rendah pada variabel inimenunjukkan tren historis tidak konsisten linear,
              sehingga angka proyeksi sebaiknya dipakai sebagai indikasi kasar, bukan angka pasti.
            </p>
          )}
        </>
      )}
    </article>
  );
}
