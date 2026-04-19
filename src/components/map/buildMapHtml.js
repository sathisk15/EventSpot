const buildMapHtml = (primaryColor, secondaryColor) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body { margin: 0; padding: 0; background: #f0f0f0; }
        #map { height: 100vh; width: 100vw; }
        .leaflet-control-attribution { display: none; }

        /* User Location Icon */
        .user-location-icon .target-dot {
          width: 14px; height: 14px; background-color: ${primaryColor};
          border: 3px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3); z-index: 2;
        }
        .user-location-icon .pulse {
          position: absolute; width: 30px; height: 30px; background-color: ${primaryColor};
          opacity: 0.4; border-radius: 50%; animation: pulse-animation 2s infinite ease-out; z-index: 1;
        }
        @keyframes pulse-animation {
          0% { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }

        /* Droplet Event Marker */
        .custom-leaflet-marker {
          background: transparent;
          border: none;
        }

        .event-pin {
          position: relative;
          width: 56px;
          height: 76px;
          animation: float-pin 3.2s ease-in-out infinite;
          transform-origin: center bottom;
        }

        @keyframes float-pin {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }

        .event-pin-body {
          position: relative;
          width: 56px;
          height: 56px;
          margin-top: 2px;
          border-radius: 50% 50% 50% 0;
          background: rgba(255,255,255,0.96);
          overflow: hidden;
          transform: rotate(-45deg);
          box-shadow:
            0 16px 28px rgba(15, 23, 42, 0.24),
            0 8px 14px rgba(15, 23, 42, 0.12);
        }

        .event-pin-media {
          position: absolute;
          inset: 4px;
          border-radius: 50% 50% 50% 0;
          overflow: hidden;
        }

        .event-pin-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transform: rotate(45deg) scale(1.18);
          transform-origin: center;
        }

        .event-pin-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor});
          color: white;
          font-size: 18px;
          font-weight: 800;
          transform: rotate(45deg) scale(1.05);
          transform-origin: center;
        }

        .event-pin-shadow {
          position: absolute;
          left: 50%;
          bottom: 2px;
          width: 26px;
          height: 9px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.2);
          filter: blur(3px);
          opacity: 0.38;
          transform: translateX(-50%);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        function sendEventClick(eventId) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'EVENT_CLICK', id: eventId}));
        }

        function handleImgError(el, badge) {
          el.outerHTML = '<span class="event-pin-fallback">' + badge + '</span>';
        }

        var map = L.map('map', { zoomControl: false, attributionControl: false })
          .setView([0, 0], 2);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
          subdomains: 'abcd'
        }).addTo(map);

        var userIcon = L.divIcon({
          className: 'user-location-icon',
          html: '<div class="pulse"></div><div class="target-dot"></div>',
          iconSize: [30, 30], iconAnchor: [15, 15]
        });
        var userMarker = L.marker([0, 0], { icon: userIcon }).addTo(map);

        var eventMarkersLayer = L.layerGroup().addTo(map);

        function renderEvents(eventList) {
          eventMarkersLayer.clearLayers();
          eventList.forEach(function(ev) {
            if (ev.location && ev.location.latitude !== undefined) {
              var lat = parseFloat(ev.location.latitude);
              var lng = parseFloat(ev.location.longitude);

              if (isNaN(lat) || isNaN(lng)) {
                return;
              }

              var badgeText = (ev.name ? ev.name.charAt(0) : 'E').toUpperCase();
              var imgSrc = ev.images && ev.images[0]
                ? ev.images[0].replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                : null;
              var mediaHtml = imgSrc
                ? '<img class="event-pin-photo" src="' + imgSrc + '" onerror="handleImgError(this,\\'' + badgeText + '\\')" />'
                : '<span class="event-pin-fallback">' + badgeText + '</span>';

              var pinHtml = '<div class="event-pin">' +
                              '<div class="event-pin-body">' +
                                '<div class="event-pin-media">' + mediaHtml + '</div>' +
                              '</div>' +
                              '<div class="event-pin-shadow"></div>' +
                            '</div>';

              var pinIcon = L.divIcon({
                className: 'custom-leaflet-marker',
                html: pinHtml,
                iconSize: [56, 76], iconAnchor: [28, 74]
              });

              var marker = L.marker([lat, lng], { icon: pinIcon })
                .addTo(eventMarkersLayer);

              marker.on('click', function() {
                sendEventClick(ev.id);
              });
            }
          });
        }

        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'READY'}));
        renderEvents([]);

        var tempMarker;
        map.on('click', function(e) {
          var lat = e.latlng.lat;
          var lng = e.latlng.lng;

          if (tempMarker) map.removeLayer(tempMarker);
          tempMarker = L.marker([lat, lng], { opacity: 0.6 }).addTo(map);

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_CLICK',
            lat: lat,
            lng: lng
          }));
        });

        function handleNativeMessage(event) {
          var rawData = event && event.data ? event.data : event;
          if (!rawData) {
            return;
          }

          var data;
          try {
            data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          } catch (error) {
            return;
          }

          if (data.type === 'UPDATE_LOCATION') {
            if (tempMarker) { map.removeLayer(tempMarker); tempMarker = null; }
            map.setView([data.lat, data.lng], 15);
            userMarker.setLatLng([data.lat, data.lng]);
          } else if (data.type === 'ZOOM_IN') {
            map.zoomIn();
          } else if (data.type === 'ZOOM_OUT') {
            map.zoomOut();
          } else if (data.type === 'SET_EVENTS') {
            renderEvents(data.events);
          }
        }

        window.addEventListener('message', handleNativeMessage);
        document.addEventListener('message', handleNativeMessage);
      </script>
    </body>
  </html>
`;

export default buildMapHtml;
