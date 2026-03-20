import { useEffect, useState } from 'react';
import { MapPin, Navigation, Smartphone } from 'lucide-react';

const LocationMap = ({ employeeName, location }) => {
  const [mapUrl, setMapUrl] = useState('');

  useEffect(() => {
    if (location && location.latitude && location.longitude) {
      // إنشاء رابط Google Maps
      const lat = location.latitude;
      const lng = location.longitude;
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`;
      setMapUrl(googleMapsUrl);
    }
  }, [location]);

  if (!location || !location.latitude || !location.longitude) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-12 text-center">
        <MapPin size={64} className="mx-auto mb-4 text-gray-400" />
        <h3 className="text-xl font-bold text-gray-700 mb-2">لم يتم تسجيل موقع</h3>
        <p className="text-gray-500">الموظف لم يشارك موقعه بعد</p>
      </div>
    );
  }

  const openInGoogleMaps = () => {
    window.open(
      `https://www.google.com/maps?q=${location.latitude},${location.longitude}`,
      '_blank'
    );
  };

  const openInWaze = () => {
    window.open(
      `https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes`,
      '_blank'
    );
  };

  return (
    <div className="space-y-4">
      {/* معلومات الموقع */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="text-blue-600" size={24} />
          موقع {employeeName}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">خط العرض</p>
            <p className="font-mono text-lg font-bold text-gray-800">{location.latitude?.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">خط الطول</p>
            <p className="font-mono text-lg font-bold text-gray-800">{location.longitude?.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">الدقة</p>
            <p className="font-bold text-green-600">{location.accuracy ? `${location.accuracy?.toFixed(0)}م` : 'غير متوفر'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">آخر تحديث</p>
            <p className="font-bold text-gray-700">
              {location.timestamp ? new Date(location.timestamp).toLocaleTimeString('ar-IQ') : 'غير متوفر'}
            </p>
          </div>
        </div>

        {/* أزرار الملاحة */}
        <div className="flex gap-3">
          <button
            onClick={openInGoogleMaps}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all font-bold flex items-center justify-center gap-2"
          >
            <Navigation size={20} />
            فتح في Google Maps
          </button>
          <button
            onClick={openInWaze}
            className="flex-1 bg-cyan-500 text-white px-6 py-3 rounded-xl hover:bg-cyan-600 transition-all font-bold flex items-center justify-center gap-2"
          >
            <Smartphone size={20} />
            فتح في Waze
          </button>
        </div>
      </div>

      {/* الخريطة المدمجة */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{ height: '500px' }}>
        <iframe
          src={mapUrl}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`موقع ${employeeName}`}
        />
      </div>

      {/* معلومات إضافية */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800 flex items-center gap-2">
          <MapPin size={16} />
          <span>يتم تحديث الموقع تلقائياً عند تسجيل دخول/خروج الموظف أو قبول المهام</span>
        </p>
      </div>
    </div>
  );
};

export default LocationMap;
