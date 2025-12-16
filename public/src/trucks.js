$(document).ready(function() {
    // Fetch all trucks when page loads
    fetchTrucks();

    function fetchTrucks() {
        $.ajax({
            type: "GET",
            url: '/api/v1/trucks/view',
            success: function(trucks) {
                $('#loading').hide();
                
                if (!trucks || trucks.length === 0) {
                    $('#no-trucks').show();
                    return;
                }

                displayTrucks(trucks);
            },
            error: function(error) {
                $('#loading').hide();
                console.error('Error fetching trucks:', error);
                
                // Show user-friendly error message
                $('#no-trucks').html(`
                    <h3>Unable to Load Trucks</h3>
                    <p>We're having trouble loading the food trucks. Please try again later.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Retry</button>
                `).show();
            }
        });
    }

    function displayTrucks(trucks) {
        const container = $('#trucks-container');
        container.empty();

       trucks.forEach(function(truck) {
            const status = truck.orderStatus || truck.status || 'unavailable';
            const statusClass = status === 'available' ? 'status-open' : 'status-closed';
            const statusText = status === 'available' ? 'Available' : 'Unavailable';
            
            // Handle logo display
            let logoHtml;
            if (truck.truckLogo) {
                console.log('Loading logo:', truck.truckLogo, 'for truck:', truck.truckName);
                
                // Try different common paths (Express usually serves static files from /public)
                logoHtml = `<img src="/images/logos/${truck.truckLogo}" 
                                 alt="${escapeHtml(truck.truckName)} Logo" 
                                 onload="console.log('✓ Logo loaded:', this.src)"
                                 onerror="console.error('✗ Logo failed:', this.src); 
                                          this.onerror=null; 
                                          this.src='/public/images/logos/${truck.truckLogo}'; 
                                          this.onerror=function(){ this.parentElement.innerHTML='<div class=\\'placeholder\\'>🚚</div>'; };" />`;
            } else {
                console.log('No logo in database for truck:', truck.truckName);
                logoHtml = `<div class="placeholder">🚚</div>`;
            }
            
            const truckCard = `
                <div class="col-md-4 col-sm-6">
                    <div class="truck-card">
                        <div class="truck-logo">
                            ${logoHtml}
                        </div>

                        <h3>${escapeHtml(truck.truckName)}</h3>
                        <span class="truck-status ${statusClass}">${statusText}</span>
                        <p>
                            ${escapeHtml(truck.description || 'Delicious food awaits!')}
                        </p>
                        <button 
                            class="btn btn-primary btn-lg view-menu-btn" 
                            data-truck-id="${truck.truckId}">
                            View Menu
                        </button>
                    </div>
                </div>
            `;
            
            container.append(truckCard);
        });

        // Add click event to all View Menu buttons
        $('.view-menu-btn').click(function() {
            const truckId = $(this).data('truck-id');
            location.href = `/truckMenu/${truckId}`;
        });
    }

    // Helper function to escape HTML and prevent XSS
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
});