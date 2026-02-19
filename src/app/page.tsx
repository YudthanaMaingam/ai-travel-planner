"use client";

import { useState, useEffect, useRef } from "react";
import { Map, MapMarker, MarkerContent, MarkerPopup, MapControls, MapRoute } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MapPin, Calendar, Save, History, Plus } from "lucide-react";
import ReactMarkdown from 'react-markdown';

interface Location {
  name: string;
  lat: number;
  lng: number;
  day?: number;
  description?: string;
}

interface TripPlan {
  _id?: string;
  title: string;
  destination: string;
  duration: string;
  plan: string;
  locations: Location[];
}

export default function TravelPlanner() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<TripPlan | null>(null);
  const [savedTrips, setSavedTrips] = useState<TripPlan[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [mapViewport, setMapViewport] = useState({
    center: [100.5231, 13.7367] as [number, number], // Bangkok
    zoom: 5,
  });

  useEffect(() => {
    fetchSavedTrips();
  }, []);

  const fetchSavedTrips = async () => {
    try {
      const res = await fetch("/api/trips");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSavedTrips(data);
      }
    } catch (error) {
      console.error("Failed to fetch trips:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
      } else {
        setCurrentTrip(data);
        if (data.locations && data.locations.length > 0) {
          // Focus map on the first location
          setMapViewport({
            center: [data.locations[0].lng, data.locations[0].lat],
            zoom: 10,
          });
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      alert("Failed to connect to AI");
    } finally {
      setIsLoading(false);
      setInput("");
    }
  };

  const saveTrip = async () => {
    if (!currentTrip || isLoading) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentTrip),
      });
      if (res.ok) {
        alert("Trip saved successfully!");
        fetchSavedTrips();
      }
    } catch (error) {
      alert("Failed to save trip");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrip = (trip: TripPlan) => {
    setCurrentTrip(trip);
    if (trip.locations && trip.locations.length > 0) {
      setMapViewport({
        center: [trip.locations[0].lng, trip.locations[0].lat],
        zoom: 10,
      });
    }
    setShowHistory(false);
  };

  // Extract coordinates for the route
  const routeCoordinates = currentTrip?.locations?.map(loc => [loc.lng, loc.lat] as [number, number]) || [];

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center bg-card shadow-sm z-20">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapPin className="text-primary" /> AI Travel Planner
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-2 h-4 w-4" /> History
          </Button>
          {currentTrip && !currentTrip._id && (
            <Button size="sm" onClick={saveTrip} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" /> Save Plan
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => {setCurrentTrip(null); setInput("");}}>
            <Plus className="h-4 w-4" /> New
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar / Chat & Plan Area */}
        <div className="w-full md:w-[450px] flex flex-col border-r bg-card z-10 shadow-lg">
          <ScrollArea className="flex-1 p-4">
            {!currentTrip ? (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-4 pt-20">
                <div className="bg-primary/10 p-6 rounded-full">
                  <MapPin className="h-12 w-12 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Where do you want to go?</h2>
                <p className="text-muted-foreground px-10">
                  Tell AI your destination and how many days you have. For example: "Plan a 3-day trip to Lamphun"
                </p>
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold">{currentTrip.title}</h2>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {currentTrip.destination}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {currentTrip.duration}</span>
                  </div>
                </div>
                
                <div className="prose prose-sm dark:prose-invert max-w-none border-t pt-4">
                  <ReactMarkdown>{currentTrip.plan}</ReactMarkdown>
                </div>

                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" /> Landmarks
                  </h3>
                  {currentTrip.locations.map((loc, idx) => (
                    <Card key={idx} className="hover:bg-accent/50 cursor-pointer transition-colors" 
                          onClick={() => setMapViewport({ center: [loc.lng, loc.lat], zoom: 15 })}>
                      <CardContent className="p-3">
                        <div className="flex justify-between">
                          <span className="font-medium">{idx + 1}. {loc.name}</span>
                          {loc.day && <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Day {loc.day}</span>}
                        </div>
                        {loc.description && <p className="text-xs text-muted-foreground mt-1">{loc.description}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Plan a 3-day trip to Lamphun..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading}
              />
              <Button onClick={handleSend} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative">
          <Map
            viewport={mapViewport}
            onViewportChange={setMapViewport}
            className="w-full h-full"
          >
            <MapControls showZoom showLocate showFullscreen />
            
            {currentTrip?.locations.map((loc, idx) => (
              <MapMarker key={idx} longitude={loc.lng} latitude={loc.lat}>
                <MarkerContent>
                  <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                    {idx + 1}
                  </div>
                </MarkerContent>
                <MarkerPopup>
                  <div className="p-2 min-w-[150px]">
                    <h4 className="font-bold text-sm">{loc.name}</h4>
                    {loc.day && <p className="text-[10px] text-muted-foreground">Day {loc.day}</p>}
                    {loc.description && <p className="text-xs mt-1">{loc.description}</p>}
                  </div>
                </MarkerPopup>
              </MapMarker>
            ))}

            {routeCoordinates.length > 1 && (
              <MapRoute 
                coordinates={routeCoordinates}
                color="#3b82f6"
                width={4}
                opacity={0.6}
              />
            )}
          </Map>

          {/* History Overlay */}
          {showHistory && (
            <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm p-8">
              <div className="max-w-2xl mx-auto bg-card border rounded-xl shadow-2xl h-full flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-xl font-bold">Saved Trips</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>Close</Button>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {savedTrips.length === 0 ? (
                    <p className="text-center text-muted-foreground py-20">No saved trips yet.</p>
                  ) : (
                    <div className="grid gap-4">
                      {savedTrips.map((trip) => (
                        <Card key={trip._id} className="cursor-pointer hover:border-primary transition-all" onClick={() => loadTrip(trip)}>
                          <CardHeader className="p-4">
                            <CardTitle className="text-lg">{trip.title}</CardTitle>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>{trip.destination}</span>
                              <span>{trip.duration}</span>
                            </div>
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
