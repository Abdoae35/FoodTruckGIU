$(document).ready(function() {
    
    // Cancel button - return to menu items list
    $('#cancel-btn').click(function() {
        location.href = '/menuItems';
    });

    // Form submission
    $('#add-item-form').submit(function(e) {
        e.preventDefault();

        // Get form values
        const itemName = $('#item-name').val().trim();
        const itemCategory = $('#item-category').val().trim();
        const itemDescription = $('#item-description').val().trim();
        const itemPrice = parseFloat($('#item-price').val());
        const itemStatus = $('#item-status').val();

        // Validate required fields
        if (!itemName) {
            alert('Please enter item name');
            $('#item-name').focus();
            return;
        }

        if (!itemCategory) {
            alert('Please enter item category');
            $('#item-category').focus();
            return;
        }

        if (!itemPrice || itemPrice <= 0) {
            alert('Please enter a valid price greater than 0');
            $('#item-price').focus();
            return;
        }

        // Validate price has maximum 2 decimal places
        if (itemPrice.toFixed(2) !== itemPrice.toString()) {
            const roundedPrice = itemPrice.toFixed(2);
            if (confirm(`Price will be rounded to $${roundedPrice}. Continue?`)) {
                $('#item-price').val(roundedPrice);
            } else {
                return;
            }
        }

        // Create menu item object
        const newItem = {
            name: itemName,
            category: itemCategory,
            description: itemDescription || null,
            price: parseFloat(itemPrice.toFixed(2)),
            status: itemStatus
        };

        // Submit to API
        addMenuItem(newItem);
    });

    function addMenuItem(itemData) {
        // Disable submit button to prevent double submission
        $('#submit-btn').prop('disabled', true).text('Adding...');

        $.ajax({
            type: "POST",
            url: '/api/v1/menuItem/new',
            data: itemData,
            success: function(response) {
                // Show success message
                $('#success-message').fadeIn();
                
                // Reset form
                $('#add-item-form')[0].reset();
                
                // Re-enable button
                $('#submit-btn').prop('disabled', false).text('➕ Add Menu Item');

                // Redirect to menu items page after 2 seconds
                setTimeout(function() {
                    location.href = '/menuItems';
                }, 2000);
            },
            error: function(error) {
                // Re-enable button
                $('#submit-btn').prop('disabled', false).text('➕ Add Menu Item');
                
                console.error('Error adding menu item:', error);
                
                if (error.responseText) {
                    alert(`Failed to add menu item: ${error.responseText}`);
                } else {
                    alert('Failed to add menu item. Please try again.');
                }
            }
        });
    }

    // Price input validation - ensure only 2 decimal places
    $('#item-price').on('input', function() {
        const value = $(this).val();
        if (value.includes('.')) {
            const parts = value.split('.');
            if (parts[1] && parts[1].length > 2) {
                $(this).val(parseFloat(value).toFixed(2));
            }
        }
    });
});