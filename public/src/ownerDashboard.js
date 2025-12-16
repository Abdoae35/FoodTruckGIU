$(document).ready(function() {
    let truckData = null;

    // Fetch all data when page loads
    fetchTruckInfo();
    fetchMenuStats();
    fetchOrderStats();
    fetchRecentOrders();

    function fetchTruckInfo() {
        $.ajax({
            type: "GET",
            url: '/api/v1/trucks/myTruck',
            success: function(truck) {
                if (truck) {
                    truckData = truck;
                    displayTruckInfo(truck);
                }
                $('#loading').hide();
                $('#dashboard-content').show();
            },
            error: function(error) {
                $('#loading').hide();
                console.error('Error fetching truck info:', error);
                alert('Failed to load truck information.');
            }
        });
    }

    function displayTruckInfo(truck) {
        $('#truck-name').text(truck.name || 'My Food Truck');
        
        const status = truck.orderStatus || 'unavailable';
        const statusClass = status === 'available' ? 'status-open' : 'status-closed';
        const statusText = status === 'available' ? 'Available' : 'Unavailable';
        
        $('#truck-status').removeClass('status-open status-closed').addClass(statusClass).text(statusText);
        $('#availability-toggle').val(status);
    }

    function fetchMenuStats() {
        $.ajax({
            type: "GET",
            url: '/api/v1/menuItem/view',
            success: function(items) {
                const totalItems = items ? items.length : 0;
                $('#total-items').text(totalItems);
            },
            error: function(error) {
                console.error('Error fetching menu stats:', error);
            }
        });
    }

    function fetchOrderStats() {
        $.ajax({
            type: "GET",
            url: '/api/v1/order/truckOrders',
            success: function(orders) {
                if (!orders || orders.length === 0) {
                    return;
                }

                const pendingCount = orders.filter(o => 
                    o.orderStatus === 'pending' || o.orderStatus === 'preparing'
                ).length;
                
                const completedCount = orders.filter(o => 
                    o.orderStatus === 'completed'
                ).length;

                $('#pending-orders').text(pendingCount);
                $('#completed-orders').text(completedCount);
            },
            error: function(error) {
                console.error('Error fetching order stats:', error);
            }
        });
    }

    function fetchRecentOrders() {
        $.ajax({
            type: "GET",
            url: '/api/v1/order/truckOrders',
            success: function(orders) {
                if (!orders || orders.length === 0) {
                    return;
                }

                // Sort by date and get latest 5
                orders.sort((a, b) => {
                    const dateA = new Date(a.orderDate || a.createdAt || 0);
                    const dateB = new Date(b.orderDate || b.createdAt || 0);
                    return dateB - dateA;
                });

                const recentOrders = orders.slice(0, 5);
                displayRecentOrders(recentOrders);
            },
            error: function(error) {
                console.error('Error fetching recent orders:', error);
            }
        });
    }

    function displayRecentOrders(orders) {
        const container = $('#recent-orders-list');
        container.empty();

        if (orders.length === 0) {
            container.html('<p class="text-center" style="color: #999; padding: 20px;">No recent orders</p>');
            return;
        }

        orders.forEach(function(order) {
            const statusClass = getStatusClass(order.orderStatus);
            const date = formatDate(order.orderDate || order.createdAt);
            
            const orderHtml = `
                <div class="order-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>Order #${order.orderId}</strong>
                            <br>
                            <small style="color: #999;">${date}</small>
                        </div>
                        <div style="text-align: right;">
                            <span class="label ${statusClass}">${order.orderStatus}</span>
                            <br>
                            <strong style="color: #5cb85c; font-size: 16px;">$${parseFloat(order.totalPrice || 0).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            `;
            
            container.append(orderHtml);
        });
    }

    function getStatusClass(status) {
        if (!status) return 'label-default';
        const statusLower = status.toLowerCase();
        if (statusLower === 'pending') return 'label-warning';
        if (statusLower === 'preparing') return 'label-info';
        if (statusLower === 'ready') return 'label-success';
        if (statusLower === 'completed') return 'label-default';
        return 'label-default';
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid Date';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
        };
        
        return date.toLocaleString('en-US', options);
    }

    // Handle availability toggle
    $('#availability-toggle').change(function() {
        const newStatus = $(this).val();
        updateTruckStatus(newStatus);
    });

    function updateTruckStatus(newStatus) {
        if (!truckData || !truckData.truckId) {
            alert('Truck information not loaded');
            return;
        }

        $.ajax({
            type: "PUT",
            url: `/api/v1/trucks/updateOrderStatus`,
            data: { 
                orderStatus: newStatus 
            },
            success: function(response) {
                // Update UI
                const statusClass = newStatus === 'available' ? 'status-open' : 'status-closed';
                const statusText = newStatus === 'available' ? 'Available' : 'Unavailable';
                $('#truck-status').removeClass('status-open status-closed').addClass(statusClass).text(statusText);
                
                // Update local data
                truckData.orderStatus = newStatus;
                
                // Show success message
                alert(`Truck status updated to ${statusText}`);
            },
            error: function(error) {
                console.error('Error updating truck status:', error);
                alert('Failed to update truck status. Please try again.');
                // Revert the dropdown
                $('#availability-toggle').val(truckData.orderStatus || 'unavailable');
            }
        });
    }
});