$(document).ready(function() {
    let menuItems = [];

    // Fetch menu items when page loads
    fetchMenuItems();

    function fetchMenuItems() {
        $.ajax({
            type: "GET",
            url: '/api/v1/menuItem/view',
            success: function(items) {
                $('#loading').hide();
                
                if (!items || items.length === 0) {
                    $('#empty-state').show();
                    return;
                }

                menuItems = items;
                displayMenuItems();
                $('#menu-table-container').show();
            },
            error: function(error) {
                $('#loading').hide();
                console.error('Error fetching menu items:', error);
                alert('Failed to load menu items. Please try again.');
            }
        });
    }

    function displayMenuItems() {
        const tbody = $('#menu-items-tbody');
        tbody.empty();

        menuItems.forEach(function(item) {
            const statusClass = item.status === 'available' ? 'status-available' : 'status-unavailable';
            const statusText = item.status === 'available' ? 'Available' : 'Unavailable';
            
            const row = `
                <tr>
                    <td>${item.itemId}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.category || 'N/A'}</td>
                    <td><div class="item-description" title="${item.description || ''}">${item.description || 'No description'}</div></td>
                    <td><strong>$${parseFloat(item.price).toFixed(2)}</strong></td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td class="action-buttons">
                        <button class="btn btn-info btn-sm view-btn" data-item-id="${item.itemId}">
                            View
                        </button>
                        <button class="btn btn-primary btn-sm edit-btn" data-item-id="${item.itemId}">
                            Edit
                        </button>
                        <button class="btn btn-danger btn-sm delete-btn" data-item-id="${item.itemId}">
                          Delete
                        </button>
                    </td>
                </tr>
            `;
            
            tbody.append(row);
        });

        // Attach event handlers
        attachEventHandlers();
    }

    function attachEventHandlers() {
        // View button
        $('.view-btn').off('click').on('click', function() {
            const itemId = $(this).data('item-id');
            viewItemDetails(itemId);
        });

        // Edit button
        $('.edit-btn').off('click').on('click', function() {
            const itemId = $(this).data('item-id');
            openEditModal(itemId);
        });

        // Delete button
        $('.delete-btn').off('click').on('click', function() {
            const itemId = $(this).data('item-id');
            const item = menuItems.find(i => i.itemId === itemId);
            if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                deleteItem(itemId);
            }
        });
    }

    function viewItemDetails(itemId) {
        $('#item-details-body').html('<p class="text-center">Loading...</p>');
        $('#viewItemModal').modal('show');

        $.ajax({
            type: "GET",
            url: `/api/v1/menuItem/view/${itemId}`,
            success: function(item) {
                displayItemDetails(item);
            },
            error: function(error) {
                console.error('Error fetching item details:', error);
                $('#item-details-body').html('<p class="text-center text-danger">Failed to load item details</p>');
            }
        });
    }

    function displayItemDetails(item) {
        const statusClass = item.status === 'available' ? 'status-available' : 'status-unavailable';
        const statusText = item.status === 'available' ? 'Available' : 'Unavailable';
        
        const detailsHtml = `
            <div>
                <div style="margin-bottom: 15px;">
                    <strong>Item ID:</strong> ${item.itemId}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Name:</strong> ${item.name}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Category:</strong> ${item.category || 'N/A'}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Description:</strong><br>
                    ${item.description || 'No description provided'}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Price:</strong> $${parseFloat(item.price).toFixed(2)}
                </div>
                <div style="margin-bottom: 15px;">
                    <strong>Status:</strong> 
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
            </div>
        `;
        
        $('#item-details-body').html(detailsHtml);
    }

    function openEditModal(itemId) {
        const item = menuItems.find(i => i.itemId === itemId);
        if (!item) {
            alert('Item not found');
            return;
        }

        // Populate form
        $('#edit-item-id').val(item.itemId);
        $('#edit-item-name').val(item.name);
        $('#edit-item-category').val(item.category || '');
        $('#edit-item-description').val(item.description || '');
        $('#edit-item-price').val(parseFloat(item.price));
        $('#edit-item-status').val(item.status || 'available');

        // Show modal
        $('#editItemModal').modal('show');
    }

    // Save edit button
    $('#save-edit-btn').click(function() {
        const itemId = $('#edit-item-id').val();
        const updatedItem = {
            name: $('#edit-item-name').val().trim(),
            category: $('#edit-item-category').val().trim(),
            description: $('#edit-item-description').val().trim(),
            price: parseFloat($('#edit-item-price').val()),
            status: $('#edit-item-status').val()
        };

        // Validate
        if (!updatedItem.name || !updatedItem.category || !updatedItem.price) {
            alert('Please fill in all required fields');
            return;
        }

        if (updatedItem.price <= 0) {
            alert('Price must be greater than 0');
            return;
        }

        updateItem(itemId, updatedItem);
    });

    function updateItem(itemId, updatedItem) {
        $.ajax({
            type: "PUT",
            url: `/api/v1/menuItem/edit/${itemId}`,
            data: updatedItem,
            success: function(response) {
                alert('Item updated successfully!');
                $('#editItemModal').modal('hide');
                // Refresh the list
                fetchMenuItems();
            },
            error: function(error) {
                console.error('Error updating item:', error);
                if (error.responseText) {
                    alert(`Failed to update item: ${error.responseText}`);
                } else {
                    alert('Failed to update item. Please try again.');
                }
            }
        });
    }

    function deleteItem(itemId) {
        $.ajax({
            type: "DELETE",
            url: `/api/v1/menuItem/delete/${itemId}`,
            success: function(response) {
                alert('Item deleted successfully!');
                // Refresh the list
                fetchMenuItems();
            },
            error: function(error) {
                console.error('Error deleting item:', error);
                if (error.responseText) {
                    alert(`Failed to delete item: ${error.responseText}`);
                } else {
                    alert('Failed to delete item. Please try again.');
                }
            }
        });
    }
});