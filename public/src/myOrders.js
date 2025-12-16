$(document).ready(function() {
    let orders = [];

    // Fetch orders when page loads
    fetchOrders();

    function fetchOrders() {
        $.ajax({
            type: "GET",
            url: '/api/v1/order/myOrders',
            success: function(data) {
                $('#loading').hide();
                
                if (!data || data.length === 0) {
                    $('#empty-orders').show();
                    return;
                }

                orders = data;
                // Sort by most recent first
                orders.sort(function(a, b) {
                    const dateA = new Date(a.createdAt || 0);
                    const dateB = new Date(b.createdAt || 0);
                    return dateB - dateA;
                });

                displayOrders();
            },
            error: function(error) {
                $('#loading').hide();
                console.error('Error fetching orders:', error);
                alert('Failed to load orders. Please try again.');
            }
        });
    }

    function displayOrders() {
        const container = $('#orders-container');
        container.empty();

        orders.forEach(function(order) {
            const statusClass = getStatusClass(order.orderStatus);
            const formattedDate = formatDate(order.createdAt);
            const scheduledPickup = formatDate(order.scheduledPickupTime);
            const earliestPickup = formatDate(order.estimatedEarliestPickup);

            const orderCard = `
                <div class="order-card">
                    <div class="order-header">
                        <div>
                            <div class="order-id">Order #${order.orderId}</div>
                            <small style="color: #999;">Placed: ${formattedDate}</small>
                        </div>
                        <span class="order-status ${statusClass}">${order.orderStatus}</span>
                    </div>

                    <div class="order-info">
                        <div class="info-item">
                            <span class="info-label">Truck Name</span>
                            <span class="info-value">${order.truckName || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Scheduled Pickup</span>
                            <span class="info-value">${scheduledPickup}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Earliest Pickup</span>
                            <span class="info-value">${earliestPickup}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Amount</span>
                            <span class="info-value order-total">$${parseFloat(order.totalPrice || 0).toFixed(2)}</span>
                        </div>
                    </div>

                    <button class="btn btn-primary view-details-btn" data-order-id="${order.orderId}">
                        View Details
                    </button>

                    <div class="order-details" id="details-${order.orderId}">
                        <div class="text-center">
                            <p>Loading order details...</p>
                        </div>
                    </div>
                </div>
            `;
            
            container.append(orderCard);
        });

        // Attach click handlers
        attachViewDetailsHandlers();
    }

    function getStatusClass(status) {
        if (!status) return 'status-pending';
        
        const statusLower = status.toLowerCase();
        if (statusLower === 'pending') return 'status-pending';
        if (statusLower === 'preparing') return 'status-preparing';
        if (statusLower === 'ready') return 'status-ready';
        if (statusLower === 'completed') return 'status-completed';
        if (statusLower === 'cancelled') return 'status-cancelled';
        return 'status-pending';
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        
        const date = new Date(dateString);
        
        // Check if date is valid
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

    function attachViewDetailsHandlers() {
        $('.view-details-btn').off('click').on('click', function() {
            const orderId = $(this).data('order-id');
            const detailsDiv = $(`#details-${orderId}`);
            const button = $(this);

            // Toggle details visibility
            if (detailsDiv.is(':visible')) {
                detailsDiv.slideUp();
                button.text('View Details');
            } else {
                // Check if details are already loaded
                if (detailsDiv.data('loaded')) {
                    detailsDiv.slideDown();
                    button.text('Hide Details');
                } else {
                    // Fetch order details
                    fetchOrderDetails(orderId, detailsDiv, button);
                }
            }
        });
    }

    function fetchOrderDetails(orderId, detailsDiv, button) {
        $.ajax({
            type: "GET",
            url: `/api/v1/order/details/${orderId}`,
            success: function(details) {
                displayOrderDetails(details, detailsDiv, button);
            },
            error: function(error) {
                console.error('Error fetching order details:', error);
                detailsDiv.html('<div class="text-center text-danger"><p>Failed to load order details</p></div>');
                detailsDiv.slideDown();
            }
        });
    }

    function displayOrderDetails(details, detailsDiv, button) {
        if (!details || !details.items || details.items.length === 0) {
            detailsDiv.html('<div class="text-center"><p>No items found in this order</p></div>');
            detailsDiv.slideDown();
            button.text('Hide Details');
            detailsDiv.data('loaded', true);
            return;
        }

        let detailsHtml = '<h4 style="margin-bottom: 15px;">Order Items:</h4>';
        
        details.items.forEach(function(item) {
            const itemTotal = parseFloat(item.price || item.itemPrice || 0) * parseInt(item.quantity || 1);
            detailsHtml += `
                <div class="detail-item">
                    <div>
                        <strong>${item.itemName || item.name}</strong>
                        <br>
                        <small style="color: #999;">Quantity: ${item.quantity || 1}</small>
                    </div>
                    <div style="text-align: right;">
                        <strong>$${itemTotal.toFixed(2)}</strong>
                        <br>
                        <small style="color: #999;">$${parseFloat(item.price || item.itemPrice || 0).toFixed(2)} each</small>
                    </div>
                </div>
            `;
        });

        // Add total if available
        if (details.totalPrice || details.totalAmount) {
            const total = details.totalPrice || details.totalAmount;
            detailsHtml += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd;">
                    <div class="detail-item" style="border: none;">
                        <strong style="font-size: 18px;">Total:</strong>
                        <strong style="font-size: 18px; color: #5cb85c;">$${parseFloat(total).toFixed(2)}</strong>
                    </div>
                </div>
            `;
        }

        detailsDiv.html(detailsHtml);
        detailsDiv.data('loaded', true);
        detailsDiv.slideDown();
        button.text('Hide Details');
    }
});