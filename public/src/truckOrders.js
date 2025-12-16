    $(document).ready(function() {
        let allOrders = [];
        let currentFilter = 'all';

        // Fetch orders when page loads
        fetchOrders();

        function fetchOrders() {
            $.ajax({
                type: "GET",
                url: '/api/v1/order/truckOrders',
                success: function(orders) {
                    $('#loading').hide();
                    
                    if (!orders || orders.length === 0) {
                        $('#empty-state').show();
                        return;
                    }

                    allOrders = orders;
                    // Sort by most recent first
                    allOrders.sort((a, b) => {
                        const dateA = new Date(a.orderDate || a.createdAt || 0);
                        const dateB = new Date(b.orderDate || b.createdAt || 0);
                        return dateB - dateA;
                    });

                    displayOrders(allOrders);
                },
                error: function(error) {
                    $('#loading').hide();
                    console.error('Error fetching orders:', error);
                    alert('Failed to load orders. Please try again.');
                }
            });
        }

        // Filter button handlers
        $('.filter-btn').click(function() {
            $('.filter-btn').removeClass('active');
            $(this).addClass('active');
            
            currentFilter = $(this).data('filter');
            filterOrders(currentFilter);
        });

        function filterOrders(filter) {
            if (filter === 'all') {
                displayOrders(allOrders);
            } else {
                const filtered = allOrders.filter(order => 
                    order.orderStatus.toLowerCase() === filter.toLowerCase()
                );
                displayOrders(filtered);
            }
        }

        function displayOrders(orders) {
            const container = $('#orders-container');
            container.empty();

            if (orders.length === 0) {
                container.html('<div class="empty-state"><h3>No orders found</h3><p>No orders match the selected filter</p></div>');
                return;
            }

            orders.forEach(function(order) {
                const statusClass = getStatusClass(order.orderStatus);
                const orderDate = formatDate(order.orderDate || order.createdAt);
                const pickupTime = formatDate(order.scheduledPickupTime);

                const orderCard = `
                    <div class="order-card">
                        <div class="order-header">
                            <div>
                                <div class="order-id">Order #${order.orderId}</div>
                                <small style="color: #999;">Placed: ${orderDate}</small>
                            </div>
                            <span class="order-status-badge ${statusClass}" id="status-badge-${order.orderId}">
                                ${order.orderStatus}
                            </span>
                        </div>

                        <div class="order-info">
                            <div class="info-item">
                                <span class="info-label">Customer Name</span>
                                <span class="info-value">${order.customerName || order.userName || 'N/A'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Pickup Time</span>
                                <span class="info-value">${pickupTime}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Total Amount</span>
                                <span class="info-value" style="color: #5cb85c; font-size: 20px; font-weight: bold;">
                                    $${parseFloat(order.totalPrice || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <!-- View Details Button -->
                        <button class="btn btn-info view-details-btn" data-order-id="${order.orderId}">
                            View Order Details
                        </button>

                        <!-- Order Details Section (Hidden by default) -->
                        <div class="order-details-section" id="details-${order.orderId}">
                            <div class="text-center">
                                <p>Loading order details...</p>
                            </div>
                        </div>

                        <!-- Status Update Section -->
                        <div class="status-update-section">
                            <label style="margin: 0; font-weight: bold;">Update Status:</label>
                            <select class="form-control status-select" id="status-select-${order.orderId}" style="width: auto; display: inline-block;">
                                <option value="pending" ${order.orderStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="preparing" ${order.orderStatus === 'preparing' ? 'selected' : ''}>Preparing</option>
                                <option value="ready" ${order.orderStatus === 'ready' ? 'selected' : ''}>Ready</option>
                                <option value="completed" ${order.orderStatus === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="cancelled" ${order.orderStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                            <button class="btn btn-primary update-status-btn" data-order-id="${order.orderId}">
                                Update Status
                            </button>
                        </div>
                    </div>
                `;
                
                container.append(orderCard);
            });

            // Attach event handlers
            attachEventHandlers();
        }

        function attachEventHandlers() {
            // View Details button
            $('.view-details-btn').off('click').on('click', function() {
                const orderId = $(this).data('order-id');
                const detailsDiv = $(`#details-${orderId}`);
                const button = $(this);

                if (detailsDiv.is(':visible')) {
                    detailsDiv.slideUp();
                    button.text('View Order Details');
                } else {
                    if (detailsDiv.data('loaded')) {
                        detailsDiv.slideDown();
                        button.text('Hide Order Details');
                    } else {
                        fetchOrderDetails(orderId, detailsDiv, button);
                    }
                }
            });

            // Update Status button
            $('.update-status-btn').off('click').on('click', function() {
                const orderId = $(this).data('order-id');
                const newStatus = $(`#status-select-${orderId}`).val();
                updateOrderStatus(orderId, newStatus);
            });
        }

        function fetchOrderDetails(orderId, detailsDiv, button) {
            $.ajax({
                type: "GET",
                url: `/api/v1/order/truckOwner/${orderId}`,
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
                button.text('Hide Order Details');
                detailsDiv.data('loaded', true);
                return;
            }

            let detailsHtml = '<h4 style="margin-bottom: 15px;">Order Items:</h4>';
            
            details.items.forEach(function(item) {
                const itemTotal = parseFloat(item.price || 0) * parseInt(item.quantity || 1);
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
                            <small style="color: #999;">$${parseFloat(item.price || 0).toFixed(2)} each</small>
                        </div>
                    </div>
                `;
            });

            if (details.totalPrice) {
                detailsHtml += `
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 2px solid #ddd;">
                        <div class="detail-item" style="border: none;">
                            <strong style="font-size: 18px;">Total:</strong>
                            <strong style="font-size: 18px; color: #5cb85c;">$${parseFloat(details.totalPrice).toFixed(2)}</strong>
                        </div>
                    </div>
                `;
            }

            detailsDiv.html(detailsHtml);
            detailsDiv.data('loaded', true);
            detailsDiv.slideDown();
            button.text('Hide Order Details');
        }

        function updateOrderStatus(orderId, newStatus) {
            if (!confirm(`Are you sure you want to change the status to "${newStatus}"?`)) {
                return;
            }

            // Find the order to get its scheduledPickupTime
            const order = allOrders.find(o => o.orderId === orderId);
            if (!order) {
                alert('Order not found');
                return;
            }

            // Calculate estimatedEarliestPickup (30 minutes before scheduledPickupTime)
            let estimatedEarliestPickup = null;
            if (order.scheduledPickupTime) {
                const scheduledTime = new Date(order.scheduledPickupTime);
                const earliestTime = new Date(scheduledTime.getTime() - 30 * 60 * 1000); // 30 minutes earlier
                
                // Format as "YYYY-MM-DD HH:MM:SS"
                const year = earliestTime.getFullYear();
                const month = String(earliestTime.getMonth() + 1).padStart(2, '0');
                const day = String(earliestTime.getDate()).padStart(2, '0');
                const hours = String(earliestTime.getHours()).padStart(2, '0');
                const minutes = String(earliestTime.getMinutes()).padStart(2, '0');
                const seconds = String(earliestTime.getSeconds()).padStart(2, '0');
                
                estimatedEarliestPickup = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
            }

            const updateData = {
                orderStatus: newStatus,
                estimatedEarliestPickup: estimatedEarliestPickup
            };

            $.ajax({
                type: "PUT",
                url: `/api/v1/order/updateStatus/${orderId}`,
                data: updateData,
                success: function(response) {
                    alert('Order status updated successfully!');
                    
                    // Update UI
                    const statusClass = getStatusClass(newStatus);
                    $(`#status-badge-${orderId}`)
                        .removeClass('status-pending status-preparing status-ready status-completed status-cancelled')
                        .addClass(statusClass)
                        .text(newStatus);

                    // Update the order in local array
                    if (order) {
                        order.orderStatus = newStatus;
                    }

                    // Re-filter if needed
                    if (currentFilter !== 'all') {
                        filterOrders(currentFilter);
                    }
                },
                error: function(error) {
                    console.error('Error updating status:', error);
                    if (error.responseText) {
                        alert(`Failed to update status: ${error.responseText}`);
                    } else {
                        alert('Failed to update order status. Please try again.');
                    }
                }
            });
        }

        function getStatusClass(status) {
            if (!status) return 'status-pending';
            const statusLower = status.toLowerCase();
            return `status-${statusLower}`;
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
    });