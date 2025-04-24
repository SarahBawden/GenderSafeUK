// Global variables
let map;
let markers = [];
let bathrooms = [];
let userLocation = null;

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Clear localStorage to start fresh
    console.log('Clearing localStorage to start fresh');
    localStorage.removeItem('gendersafeuk-bathrooms');
    
    initMap();
    loadBathrooms();
    setupEventListeners();
    
    // Try to get user's location for better map centering
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Only center on user if they're in the UK (roughly)
                if (isInUK(userLocation.lat, userLocation.lng)) {
                    map.setView([userLocation.lat, userLocation.lng], 13);
                }
                
                updateBathroomList();
            },
            error => {
                console.log('Error getting location:', error);
            }
        );
    }
});

// Initialize the Leaflet map
function initMap() {
    // Center on UK by default
    map = L.map('map').setView([54.5, -3.5], 6);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
}

// Check if coordinates are roughly in the UK
function isInUK(lat, lng) {
    // Rough bounding box for UK
    return lat >= 49.5 && lat <= 61 && lng >= -11 && lng <= 2;
}

// Load bathrooms from localStorage or initialize with sample data
function loadBathrooms() {
    console.log('Loading bathrooms...');
    
    const storedBathrooms = localStorage.getItem('gendersafeuk-bathrooms');
    console.log('Stored bathrooms from localStorage:', storedBathrooms ? 'Found' : 'Not found');
    
    if (storedBathrooms) {
        bathrooms = JSON.parse(storedBathrooms);
        console.log('Parsed bathrooms from localStorage:', bathrooms.length, 'bathrooms found');
        
        // Log the names of all bathrooms
        bathrooms.forEach((bathroom, index) => {
            console.log(`Bathroom ${index + 1}:`, bathroom.name);
        });
    } else {
        console.log('No stored bathrooms found, initializing with sample data');
        // Initialize with scraped sample data
        bathrooms = getScrapedBathroomData();
        saveBathrooms();
    }
    
    // Display bathrooms on map and in list
    displayBathrooms();
    updateBathroomList();
}

// Save bathrooms to localStorage
function saveBathrooms() {
    localStorage.setItem('gendersafeuk-bathrooms', JSON.stringify(bathrooms));
}

// Display bathrooms on the map
function displayBathrooms() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Get filter states
    const showSafe = document.getElementById('filter-safe').checked;
    const showUnsafe = document.getElementById('filter-unsafe').checked;
    const showUnrated = document.getElementById('filter-unrated').checked;
    
    // Add markers for each bathroom based on filters
    bathrooms.forEach((bathroom, index) => {
        // Skip if filtered out
        if (
            (bathroom.rating === 'safe' && !showSafe) ||
            (bathroom.rating === 'unsafe' && !showUnsafe) ||
            (bathroom.rating === 'unrated' && !showUnrated)
        ) {
            return;
        }
        
        // Create marker with custom class based on rating
        const markerClass = `bathroom-marker marker-${bathroom.rating}`;
        const markerIcon = L.divIcon({
            className: markerClass,
            iconSize: [12, 12]
        });
        
        const marker = L.marker([bathroom.lat, bathroom.lng], { icon: markerIcon })
            .addTo(map);
        
        // Create popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'popup-content';
        
        const title = document.createElement('h3');
        title.textContent = bathroom.name;
        popupContent.appendChild(title);
        
        const address = document.createElement('p');
        address.textContent = bathroom.address;
        popupContent.appendChild(address);
        
        const viewDetails = document.createElement('span');
        viewDetails.className = 'view-details';
        viewDetails.textContent = 'View Details';
        viewDetails.onclick = () => showBathroomDetails(index);
        popupContent.appendChild(viewDetails);
        
        // Bind popup to marker
        marker.bindPopup(L.popup().setContent(popupContent));
        
        // Store marker reference
        markers.push(marker);
    });
}

// Update the bathroom list in the sidebar
function updateBathroomList() {
    const container = document.getElementById('bathrooms-container');
    container.innerHTML = '';
    
    // Get filter states
    const showSafe = document.getElementById('filter-safe').checked;
    const showUnsafe = document.getElementById('filter-unsafe').checked;
    const showUnrated = document.getElementById('filter-unrated').checked;
    
    // Sort bathrooms by distance if user location is available
    let sortedBathrooms = [...bathrooms];
    if (userLocation) {
        sortedBathrooms.sort((a, b) => {
            const distA = getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng);
            const distB = getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng);
            return distA - distB;
        });
    }
    
    // Add a heading to show total number of bathrooms
    const heading = document.createElement('h3');
    heading.textContent = `Showing all ${sortedBathrooms.length} bathrooms:`;
    heading.style.marginBottom = '10px';
    heading.style.fontStyle = 'italic';
    container.appendChild(heading);
    
    // Add each bathroom to the list based on filters
    sortedBathrooms.forEach((bathroom, index) => {
        // Skip if filtered out
        if (
            (bathroom.rating === 'safe' && !showSafe) ||
            (bathroom.rating === 'unsafe' && !showUnsafe) ||
            (bathroom.rating === 'unrated' && !showUnrated)
        ) {
            return;
        }
        
        const item = document.createElement('div');
        item.className = 'bathroom-item';
        item.onclick = () => showBathroomDetails(bathrooms.indexOf(bathroom));
        
        const title = document.createElement('h3');
        title.textContent = bathroom.name;
        item.appendChild(title);
        
        const address = document.createElement('p');
        address.textContent = bathroom.address;
        item.appendChild(address);
        
        // Add distance if user location is available
        if (userLocation) {
            const distance = getDistance(userLocation.lat, userLocation.lng, bathroom.lat, bathroom.lng);
            const distanceText = document.createElement('p');
            distanceText.textContent = `${(distance / 1000).toFixed(1)} km away`;
            item.appendChild(distanceText);
        }
        
        const rating = document.createElement('div');
        rating.className = `bathroom-rating rating-${bathroom.rating}`;
        
        if (bathroom.rating === 'safe') {
            rating.textContent = '✓ Safe';
        } else if (bathroom.rating === 'unsafe') {
            rating.textContent = '✗ Unsafe';
        } else {
            rating.textContent = '? Not Rated';
        }
        
        item.appendChild(rating);
        container.appendChild(item);
    });
    
    // Show message if no bathrooms match filters
    if (container.children.length === 0) {
        const noResults = document.createElement('p');
        noResults.textContent = 'No bathrooms match your current filters.';
        noResults.style.padding = '1rem';
        noResults.style.fontStyle = 'italic';
        container.appendChild(noResults);
    }
}

// Calculate distance between two points using Haversine formula
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
}

// Show bathroom details in modal
function showBathroomDetails(index) {
    const bathroom = bathrooms[index];
    
    document.getElementById('modal-title').textContent = bathroom.name;
    document.getElementById('modal-address').textContent = bathroom.address;
    document.getElementById('modal-description').textContent = bathroom.description || 'No description available.';
    
    const ratingElement = document.getElementById('modal-rating');
    ratingElement.className = `rating-${bathroom.rating}`;
    
    if (bathroom.rating === 'safe') {
        ratingElement.textContent = '✓ This bathroom has been rated as safe.';
    } else if (bathroom.rating === 'unsafe') {
        ratingElement.textContent = '✗ This bathroom has been rated as unsafe.';
    } else {
        ratingElement.textContent = '? This bathroom has not been rated yet.';
    }
    
    // Set up rating buttons
    document.getElementById('rate-safe').onclick = () => rateBathroom(index, 'safe');
    document.getElementById('rate-unsafe').onclick = () => rateBathroom(index, 'unsafe');
    
    // Show the modal
    document.getElementById('bathroom-modal').style.display = 'block';
    
    // Center map on bathroom
    map.setView([bathroom.lat, bathroom.lng], 16);
    
    // Open the marker popup
    markers[index].openPopup();
}

// Rate a bathroom
function rateBathroom(index, rating) {
    bathrooms[index].rating = rating;
    saveBathrooms();
    
    // Update UI
    showBathroomDetails(index);
    displayBathrooms();
    updateBathroomList();
}

// Set up event listeners
function setupEventListeners() {
    // Filter checkboxes
    document.getElementById('filter-safe').addEventListener('change', () => {
        displayBathrooms();
        updateBathroomList();
    });
    
    document.getElementById('filter-unsafe').addEventListener('change', () => {
        displayBathrooms();
        updateBathroomList();
    });
    
    document.getElementById('filter-unrated').addEventListener('change', () => {
        displayBathrooms();
        updateBathroomList();
    });
    
    // Add bathroom form
    document.getElementById('add-bathroom-form').addEventListener('submit', event => {
        event.preventDefault();
        addNewBathroom();
    });
    
    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // About and privacy links
    document.getElementById('about-link').addEventListener('click', event => {
        event.preventDefault();
        document.getElementById('about-modal').style.display = 'block';
    });
    
    document.getElementById('privacy-link').addEventListener('click', event => {
        event.preventDefault();
        document.getElementById('privacy-modal').style.display = 'block';
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', event => {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Add a new bathroom from the form
function addNewBathroom() {
    console.log('addNewBathroom function called');
    
    const name = document.getElementById('bathroom-name').value.trim();
    const address = document.getElementById('bathroom-address').value.trim();
    const description = document.getElementById('bathroom-description').value.trim();
    const rating = document.querySelector('input[name="safety-rating"]:checked').value;
    
    console.log('Form values:', { name, address, description, rating });
    
    // Geocode the address to get coordinates
    geocodeAddress(address, (lat, lng) => {
        console.log('Geocoded coordinates:', { lat, lng });
        
        // Create new bathroom object
        const newBathroom = {
            name,
            address,
            description,
            rating,
            lat,
            lng
        };
        
        console.log('New bathroom object:', newBathroom);
        console.log('Current bathrooms count:', bathrooms.length);
        
        // Add to bathrooms array
        bathrooms.push(newBathroom);
        console.log('New bathrooms count:', bathrooms.length);
        
        saveBathrooms();
        console.log('Bathrooms saved to localStorage');
        
        // Update UI
        displayBathrooms();
        updateBathroomList();
        
        // Reset form
        document.getElementById('add-bathroom-form').reset();
        
        // Show success message without using alert
        const successMessage = document.createElement('div');
        successMessage.textContent = 'Bathroom added successfully to GenderSafeUK!';
        successMessage.style.position = 'fixed';
        successMessage.style.top = '20px';
        successMessage.style.left = '50%';
        successMessage.style.transform = 'translateX(-50%)';
        successMessage.style.backgroundColor = '#4caf50';
        successMessage.style.color = 'white';
        successMessage.style.padding = '10px 20px';
        successMessage.style.borderRadius = '4px';
        successMessage.style.zIndex = '2000';
        document.body.appendChild(successMessage);
        
        // Remove the message after 3 seconds
        setTimeout(() => {
            document.body.removeChild(successMessage);
        }, 3000);
        
        // Center map on new bathroom
        map.setView([lat, lng], 16);
    });
}

// Geocode an address to get coordinates
function geocodeAddress(address, callback) {
    // In a real application, you would use a geocoding service like Google Maps or Nominatim
    // For this demo, we'll simulate geocoding with a random location in the UK
    
    // For demo purposes, generate coordinates near London if address contains "London"
    // Otherwise generate random coordinates in the UK
    let lat, lng;
    
    if (address.toLowerCase().includes('london')) {
        // Random location near London
        lat = 51.5 + (Math.random() - 0.5) * 0.1;
        lng = -0.12 + (Math.random() - 0.5) * 0.1;
    } else if (address.toLowerCase().includes('manchester')) {
        // Random location near Manchester
        lat = 53.48 + (Math.random() - 0.5) * 0.1;
        lng = -2.24 + (Math.random() - 0.5) * 0.1;
    } else if (address.toLowerCase().includes('birmingham')) {
        // Random location near Birmingham
        lat = 52.48 + (Math.random() - 0.5) * 0.1;
        lng = -1.9 + (Math.random() - 0.5) * 0.1;
    } else if (address.toLowerCase().includes('edinburgh')) {
        // Random location near Edinburgh
        lat = 55.95 + (Math.random() - 0.5) * 0.1;
        lng = -3.19 + (Math.random() - 0.5) * 0.1;
    } else if (address.toLowerCase().includes('cardiff')) {
        // Random location near Cardiff
        lat = 51.48 + (Math.random() - 0.5) * 0.1;
        lng = -3.18 + (Math.random() - 0.5) * 0.1;
    } else if (address.toLowerCase().includes('belfast')) {
        // Random location near Belfast
        lat = 54.6 + (Math.random() - 0.5) * 0.1;
        lng = -5.93 + (Math.random() - 0.5) * 0.1;
    } else {
        // Random location in the UK
        lat = 52.5 + (Math.random() - 0.5) * 6;
        lng = -2 + (Math.random() - 0.5) * 6;
    }
    
    // Call the callback with the coordinates
    callback(lat, lng);
}

// Get scraped bathroom data (simulated)
function getScrapedBathroomData() {
    // In a real application, this data would come from scraping Google or other sources
    // For this demo, we'll use sample data
    return [
        {
            name: "King's Cross Station - Gender Neutral Facilities",
            address: "Euston Road, London N1C 4QP",
            description: "Located on the lower level near Platform 9¾. Accessible and well-maintained.",
            rating: "safe",
            lat: 51.5320,
            lng: -0.1235
        },
        {
            name: "Barbican Centre",
            address: "Silk Street, London EC2Y 8DS",
            description: "Gender neutral toilets available on levels G, 1, and 2.",
            rating: "safe",
            lat: 51.5200,
            lng: -0.0927
        },
        {
            name: "The Arndale Centre",
            address: "Market Street, Manchester M4 3AQ",
            description: "Gender neutral facilities on the upper floor near the food court.",
            rating: "unrated",
            lat: 53.4831,
            lng: -2.2418
        },
        {
            name: "Edinburgh University Student Union",
            address: "Potterrow, 5/2 Bristo Square, Edinburgh EH8 9AL",
            description: "Gender neutral bathrooms on all floors. Well-maintained and accessible.",
            rating: "safe",
            lat: 55.9445,
            lng: -3.1892
        },
        {
            name: "Cardiff Central Library",
            address: "The Hayes, Cardiff CF10 1FL",
            description: "Gender neutral facilities on the 3rd floor.",
            rating: "safe",
            lat: 51.4785,
            lng: -3.1760
        },
        {
            name: "Belfast City Hall",
            address: "Donegall Square, Belfast BT1 5GS",
            description: "Gender neutral bathroom in the east wing, ground floor.",
            rating: "unrated",
            lat: 54.5964,
            lng: -5.9301
        },
        {
            name: "Bullring Shopping Centre",
            address: "Birmingham B5 4BU",
            description: "Gender neutral facilities near the east entrance, ground floor.",
            rating: "unsafe",
            lat: 52.4776,
            lng: -1.8932
        },
        {
            name: "Brighton Pier",
            address: "Madeira Drive, Brighton BN2 1TW",
            description: "Gender neutral bathroom at the entrance to the pier.",
            rating: "unrated",
            lat: 50.8192,
            lng: -0.1350
        },
        {
            name: "Glasgow Kelvingrove Art Gallery",
            address: "Argyle Street, Glasgow G3 8AG",
            description: "Gender neutral facilities on the ground floor, west wing.",
            rating: "safe",
            lat: 55.8686,
            lng: -4.2906
        },
        {
            name: "Leeds University Union",
            address: "University of Leeds, Leeds LS2 9JT",
            description: "Multiple gender neutral bathrooms throughout the building.",
            rating: "safe",
            lat: 53.8067,
            lng: -1.5550
        },
        {
            name: "Bristol Watershed",
            address: "1 Canon's Road, Bristol BS1 5TX",
            description: "Gender neutral bathrooms on the ground floor.",
            rating: "safe",
            lat: 51.4512,
            lng: -2.5980
        },
        {
            name: "Newcastle Central Station",
            address: "Neville Street, Newcastle upon Tyne NE1 5DL",
            description: "Gender neutral facilities near platform 9.",
            rating: "unrated",
            lat: 54.9691,
            lng: -1.6178
        },
        {
            name: "Liverpool ONE Shopping Centre",
            address: "5 Wall Street, Liverpool L1 8JQ",
            description: "Gender neutral bathrooms on level 2 near the food court.",
            rating: "unsafe",
            lat: 53.4031,
            lng: -2.9880
        },
        {
            name: "Oxford Ashmolean Museum",
            address: "Beaumont Street, Oxford OX1 2PH",
            description: "Gender neutral facilities on the lower ground floor.",
            rating: "safe",
            lat: 51.7554,
            lng: -1.2600
        },
        {
            name: "Cambridge Junction",
            address: "Clifton Way, Cambridge CB1 7GX",
            description: "Gender neutral bathrooms in the main foyer.",
            rating: "safe",
            lat: 52.1936,
            lng: 0.1378
        }
    ];
}
