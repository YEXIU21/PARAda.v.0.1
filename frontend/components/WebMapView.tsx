import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import env from '../constants/environment';
import '../styles/WebMapView.css';

interface WebMapViewProps {
  style?: any;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  followsUserLocation?: boolean;
  children?: React.ReactNode;
  locations?: {
    driver?: { latitude: number; longitude: number };
    passenger?: { latitude: number; longitude: number };
  };
  mapStyle?: any[];
  showLocationButton?: boolean;
}

/**
 * A web-compatible map component that renders Google Maps
 * This is used as a fallback when react-native-maps is not available on web
 */
const WebMapView: React.FC<WebMapViewProps> = ({ 
  style, 
  initialRegion,
  children,
  showsUserLocation,
  locations,
  mapStyle,
  showLocationButton = true
}) => {
  const [mapError, setMapError] = useState<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  
  // Only use this component on web platform
  if (Platform.OS !== 'web') {
    return null;
  }

  const latitude = initialRegion?.latitude || 14.6091;
  const longitude = initialRegion?.longitude || 121.0223;
  const zoom = 15;
  const apiKey = env.googleMapsApiKey;
  const mapId = env.googleMapsId;

  // Load the Google Maps API script
  useEffect(() => {
    if (!apiKey) {
      setMapError(true);
      console.error('Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment variables.');
      return;
    }
    
    // Check if the script is already loaded
    const existingScript = document.getElementById('google-maps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initGoogleMap&loading=async&libraries=marker&v=beta`;
      script.async = true;
      script.defer = true;
      
      // Define the callback function in the window scope
      window.initGoogleMap = () => {
        setMapLoaded(true);
      };
      
      // Add specific error handling for Google Maps API errors
      window.gm_authFailure = () => {
        setMapError(true);
        console.error('Google Maps authentication error: The API key may not be valid or billing is not enabled');
      };
      
      script.onerror = () => {
        setMapError(true);
        console.error('Failed to load Google Maps API');
      };
      
      document.head.appendChild(script);
      
      return () => {
        // Cleanup script when component unmounts
        document.head.removeChild(script);
        // Set to undefined instead of using delete
        window.initGoogleMap = undefined as any;
      };
    } else if (window.google && window.google.maps) {
      // If script exists and maps is loaded, set loaded state
      setMapLoaded(true);
    }
  }, [apiKey]);
  
  // Initialize the map once the API is loaded
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    
    try {
      // Create map instance
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: latitude, lng: longitude },
        zoom: zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: mapStyle || [],
        mapId: mapId
      });
      
      // Remove any existing location button first
      const existingLocationButton = document.getElementById("custom-location-button");
      if (existingLocationButton) {
        try {
          existingLocationButton.parentNode?.removeChild(existingLocationButton);
        } catch (error) {
          console.error('Error removing existing location button:', error);
        }
      }
      
      // Only create the location button if showLocationButton is true
      if (showLocationButton) {
        // Enable the built-in My Location control
        const locationButton = document.createElement("button");
        locationButton.id = "custom-location-button";
        locationButton.classList.add("custom-map-location-button");
        locationButton.style.background = "none rgb(255, 255, 255)";
        locationButton.style.border = "0px";
        locationButton.style.margin = "10px";
        locationButton.style.padding = "0px";
        locationButton.style.cursor = "pointer";
        locationButton.style.borderRadius = "50%"; // Make it circular
        locationButton.style.height = "40px"; // Standard size
        locationButton.style.width = "40px";  // Standard size
        locationButton.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.3)";
        locationButton.style.display = "flex";
        locationButton.style.alignItems = "center";
        locationButton.style.justifyContent = "center";
        locationButton.style.position = "absolute";
        locationButton.style.bottom = "200px"; // Position it higher up
        locationButton.style.right = "10px";
        locationButton.style.zIndex = "1"; // Same z-index as map controls
        locationButton.title = "Your Location";
        
        // Create an SVG for the location icon instead of using an image
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("width", "18");
        svg.setAttribute("height", "18");
        svg.setAttribute("viewBox", "0 0 24 24");
        
        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("fill", "#1A73E8");
        path.setAttribute("d", "M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z");
        
        svg.appendChild(path);
        locationButton.appendChild(svg);
        
        locationButton.addEventListener("click", () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };
                
                googleMapRef.current.setCenter(pos);
                googleMapRef.current.setZoom(15);
                
                // Update the user marker if it exists, otherwise create a new one
                const existingUserMarker = mapMarkersRef.current.find(marker => marker.getTitle() === "Your Location");
                
                if (existingUserMarker) {
                  existingUserMarker.setPosition(pos);
                } else {
                  // Create marker using AdvancedMarkerElement if available
                  try {
                    if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                      // Create a marker with the modern API
                      const userMarkerElement = document.createElement('div');
                      userMarkerElement.className = 'user-location-marker';
                      userMarkerElement.style.backgroundColor = '#007AFF';
                      userMarkerElement.style.borderRadius = '50%';
                      userMarkerElement.style.border = '2px solid white';
                      userMarkerElement.style.width = '16px';
                      userMarkerElement.style.height = '16px';
                      userMarkerElement.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                      
                      const userMarker = new window.google.maps.marker.AdvancedMarkerElement({
                        position: pos,
                        map: googleMapRef.current,
                        title: "Your Location",
                        content: userMarkerElement
                      });
                      mapMarkersRef.current.push(userMarker);
                    } else {
                      throw new Error("AdvancedMarkerElement not available");
                    }
                  } catch (error) {
                    // Fallback to legacy Marker
                    console.log("Using legacy marker instead:", error);
                    const userMarker = new window.google.maps.Marker({
                      position: pos,
                      map: googleMapRef.current,
                      title: "Your Location",
                      icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        scale: 7,
                        fillColor: "#007AFF",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#FFFFFF"
                      }
                    });
                    mapMarkersRef.current.push(userMarker);
                  }
                }
              },
              () => {
                alert("Error: The Geolocation service failed.");
              }
            );
          } else {
            alert("Error: Your browser doesn't support geolocation.");
          }
        });
        
        // Append to the map container instead of document body
        mapRef.current.appendChild(locationButton);
      }
      
      // Automatically center map on user location if showsUserLocation is true
      if (showsUserLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            
            googleMapRef.current.setCenter(pos);
            
            // Create a user location marker using AdvancedMarkerElement if available
            try {
              if (window.google.maps.marker && window.google.maps.marker.AdvancedMarkerElement) {
                // Create a marker with the modern API
                const userMarkerElement = document.createElement('div');
                userMarkerElement.className = 'user-location-marker';
                userMarkerElement.style.backgroundColor = '#007AFF';
                userMarkerElement.style.borderRadius = '50%';
                userMarkerElement.style.border = '2px solid white';
                userMarkerElement.style.width = '16px';
                userMarkerElement.style.height = '16px';
                userMarkerElement.style.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
                
                const userMarker = new window.google.maps.marker.AdvancedMarkerElement({
                  position: pos,
                  map: googleMapRef.current,
                  title: "Your Location",
                  content: userMarkerElement
                });
                mapMarkersRef.current.push(userMarker);
              } else {
                throw new Error("AdvancedMarkerElement not available");
              }
            } catch (error) {
              // Fallback to legacy Marker
              console.log("Using legacy marker instead:", error);
              const userMarker = new window.google.maps.Marker({
                position: pos,
                map: googleMapRef.current,
                title: "Your Location",
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: "#007AFF",
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: "#FFFFFF"
                }
              });
              mapMarkersRef.current.push(userMarker);
            }
          },
          () => {
            console.log("Error: The Geolocation service failed.");
          }
        );
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setMapError(true);
    }

    // Clean up when component unmounts or showLocationButton changes
    return () => {
      // Remove the location button from the DOM if it exists
      const locationButton = document.getElementById("custom-location-button");
      if (locationButton) {
        try {
          locationButton.parentNode?.removeChild(locationButton);
        } catch (error) {
          console.error('Error removing location button:', error);
        }
      }
    };
  }, [mapLoaded, latitude, longitude, zoom, locations, showsUserLocation, mapStyle, showLocationButton]);

  if (!apiKey) {
    return (
      <View style={[styles.container, style, styles.errorContainer]}>
        <Text style={styles.errorText}>Google Maps API key is missing</Text>
        <Text style={styles.errorSubText}>
          Please add your Google Maps API key to the environment variables.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {mapError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Map could not be loaded
          </Text>
          <Text style={styles.errorSubText}>
            The Google Maps API key may be invalid, or billing may not be enabled for this project.
            Please check the Google Cloud Console to enable billing for the Maps JavaScript API.
          </Text>
        </View>
      ) : (
        <div 
          ref={mapRef}
        className="map-iframe"
          style={styles.mapDiv}
      />
      )}
      
      {/* Render a placeholder for children components */}
      <View style={styles.childrenContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  childrenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
    padding: 20,
  },
  errorSubText: {
    color: '#6c757d',
    textAlign: 'center',
    padding: 10,
  },
  mapDiv: {
    width: '100%',
    height: '100%',
  }
});

// Add types for global window object
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        Marker: any;
        LatLng: any;
        LatLngBounds: any;
        event: any;
        ControlPosition: any;
        SymbolPath: any;
        marker?: {
          AdvancedMarkerElement: any;
        }
      };
    };
    initGoogleMap: (() => void) | undefined;
    gm_authFailure: (() => void) | undefined;
  }
}

export default WebMapView; 