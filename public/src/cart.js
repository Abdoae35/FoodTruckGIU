$(document).ready(function() {
    let cartItems = [];
    let cartTotal = 0;

    // Set minimum pickup time to 30 minutes from now
    setMinimumPickupTime();

    // Fetch cart items when page loads
    fetchCart();

    // Convert Date to local datetime-local input format
    function toLocalInputFormat(date) {
        const pad = (n) => n.toString().padStart(2, '0');
        return date.getFullYear() + "-" +
               pad(date.getMonth() + 1) + "-" +
               pad(date.getDate()) + "T" +
               pad(date.getHours()) + ":" +
               pad(date.getMinutes());
    }

    function setMinimumPickupTime() {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30); // 30 minutes from now

        const minTime = toLocalInputFormat(now);
        $('#pickup-time').attr('min', minTime);
        $('#pickup-time').val(minTime);
    }

    function fetchCart() {
        $.ajax({
            type: "GET",
            url: '/api/v1/cart/view',
            success: function(items) {
                $('#loading').hide();
                
                if (!items || items.length === 0) {
                    $('#empty-cart').show();
                    return;
                }

                cartItems = items;
                displayCartItems();
                $('#cart-container').show();
            },
            error: function(error) {
                $('#loading').hide();
                console.error('Error fetching cart:', error);
                alert('Failed to load cart. Please try again.');
            }
        });
    }

    function displayCartItems() {
        const container = $('#cart-items');
        container.empty();
        cartTotal = 0;

        cartItems.forEach(function(item) {

            const price = parseFloat(item.itemPrice || item.price || 0);
            const qty = parseInt(item.quantity || 0);

            const subtotal = price * qty;
            cartTotal += subtotal;

            const cartItemHtml = `
                <div class="cart-item" data-cart-id="${item.cartId}">
                    <div class="cart-item-row">
                        <div class="item-info">
                            <div class="item-name">${item.itemName}</div>
                            <div class="item-price">$${price.toFixed(2)} each</div>
                            ${item.truckName ? `<small style="color: #999;">From: ${item.truckName}</small>` : ''}
                        </div>
                        
                        <div class="quantity-control">
                            <button class="btn btn-default quantity-btn decrease-btn" data-cart-id="${item.cartId}">
                                -
                            </button>
                            <span class="quantity-display">${qty}</span>
                            <button class="btn btn-default quantity-btn increase-btn" data-cart-id="${item.cartId}">
                                +
                            </button>
                        </div>
                        
                        <div class="item-subtotal">
                            $${subtotal.toFixed(2)}
                        </div>
                        
                        <button class="btn btn-danger remove-btn" data-cart-id="${item.cartId}">
                            Remove
                        </button>
                    </div>
                </div>
            `;
            
            container.append(cartItemHtml);
        });

        $('#cart-total').text(`$${cartTotal.toFixed(2)}`);

        attachCartHandlers();
    }

    function attachCartHandlers() {
        // Increase quantity
        $('.increase-btn').off('click').on('click', function() {
            const cartId = $(this).data('cart-id');
            const item = cartItems.find(i => i.cartId === cartId);
            if (item) {
                updateCartQuantity(cartId, item.quantity + 1);
            }
        });

        // Decrease quantity
        $('.decrease-btn').off('click').on('click', function() {
            const cartId = $(this).data('cart-id');
            const item = cartItems.find(i => i.cartId === cartId);
            if (item && item.quantity > 1) {
                updateCartQuantity(cartId, item.quantity - 1);
            }
        });

        // Remove item
        $('.remove-btn').off('click').on('click', function() {
            const cartId = $(this).data('cart-id');
            if (confirm('Are you sure you want to remove this item from your cart?')) {
                removeCartItem(cartId);
            }
        });
    }

    function updateCartQuantity(cartId, newQuantity) {
        $.ajax({
            type: "PUT",
            url: `/api/v1/cart/edit/${cartId}`,
            data: { quantity: newQuantity },
            success: function(response) {
                // Update local data
                const item = cartItems.find(i => i.cartId === cartId);
                if (item) {
                    item.quantity = newQuantity;
                }
                displayCartItems();
            },
            error: function(error) {
                console.error('Error updating cart:', error);
                alert('Failed to update quantity. Please try again.');
            }
        });
    }

    function removeCartItem(cartId) {
        $.ajax({
            type: "DELETE",
            url: `/api/v1/cart/delete/${cartId}`,
            success: function(response) {
                // Remove from local array
                cartItems = cartItems.filter(i => i.cartId !== cartId);
                
                if (cartItems.length === 0) {
                    $('#cart-container').hide();
                    $('#empty-cart').show();
                } else {
                    displayCartItems();
                }
            },
            error: function(error) {
                console.error('Error removing item:', error);
                alert('Failed to remove item. Please try again.');
            }
        });
    }

    // Place Order
    $('#place-order-btn').click(function() {
        const pickupTime = $('#pickup-time').val();
        
        if (!pickupTime) {
            alert('Please select a pickup time');
            return;
        }

        // Validate pickup time is in the future
        const selectedTime = new Date(pickupTime);
        const now = new Date();
        if (selectedTime <= now) {
            alert('Pickup time must be in the future');
            return;
        }

        if (cartItems.length === 0) {
            alert('Your cart is empty');
            return;
        }

        placeOrder(pickupTime);
    });

    function placeOrder(pickupTime) {
        // FIX: Send the datetime string as-is, not converted to ISO
        // The datetime-local input gives us "YYYY-MM-DDTHH:mm" format
        // which represents the LOCAL time the user selected
        
        const orderData = {
            scheduledPickupTime: pickupTime  // Send as-is, no conversion
        };

        $.ajax({
            type: "POST",
            url: '/api/v1/order/new',
            data: JSON.stringify(orderData),
            contentType: 'application/json',
            success: function(response) {
                alert('Order placed successfully!');
                location.href = '/orders';
            },
            error: function(error) {
                console.error('Error placing order:', error);
                if (error.responseJSON && error.responseJSON.error) {
                    alert(`Failed to place order: ${error.responseJSON.error}`);
                } else if (error.responseText) {
                    alert(`Failed to place order: ${error.responseText}`);
                } else {
                    alert('Failed to place order. Please try again.');
                }
            }
        });
    }
});