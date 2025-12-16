$(document).ready(function () {
    const truckId = $('#truck-id').val();

    let allMenuItems = [];
    let categories = new Set();

    fetchMenuItems();

    function fetchMenuItems() {
        $.ajax({
            type: "GET",
            url: `/api/v1/menuItem/truck/${truckId}`,
            success: function (menuItems) {
                $('#loading').hide();

                allMenuItems = menuItems;

                if (!menuItems || menuItems.length === 0) {
                    $('#menu-container').html('<p>No menu items available</p>');
                    return;
                }

                menuItems.forEach(item => {
                    if (item.category) categories.add(item.category);
                });

                if (categories.size > 0) displayCategoryFilters();
                displayMenuItems(menuItems);
            },
            error: function (error) {
                $('#loading').hide();
                alert('Failed to load menu.');
                console.error(error);
            }
        });
    }

    function displayCategoryFilters() {
        const filterContainer = $('#category-filter');
        filterContainer.show();

        categories.forEach(category => {
            filterContainer.append(`
                <button class="btn btn-primary category-btn" data-category="${category}">
                    ${category}
                </button>
            `);
        });

        $('.category-btn').click(function () {
            $('.category-btn').removeClass('active');
            $(this).addClass('active');

            const cat = $(this).data('category');
            if (cat === "all") displayMenuItems(allMenuItems);
            else filterByCategory(cat);
        });
    }

    function filterByCategory(category) {
        $.ajax({
            type: "GET",
            url: `/api/v1/menuItem/truck/${truckId}/category/${category}`,
            success: function (menuItems) {
                displayMenuItems(menuItems);
            },
            error: function () {
                alert("Error filtering items");
            }
        });
    }

    function displayMenuItems(menuItems) {
        const container = $('#menu-container');
        container.empty();

        if (!menuItems || menuItems.length === 0) {
            container.html('<p>No items found</p>');
            return;
        }

        menuItems.forEach(item => {
            container.append(`
                <div class="menu-item-card">
                    <div class="menu-item-header">
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">$${parseFloat(item.price).toFixed(2)}</div>
                    </div>

                    <div class="item-category">${item.category}</div>
                    <div class="item-description">${item.description}</div>

                    <div class="quantity-selector">
                        <button class="btn btn-default quantity-btn decrease-btn" data-id="${item.itemId}">-</button>
                        <input id="quantity-${item.itemId}" class="quantity-input" type="number" value="1" min="1" max="99">
                        <button class="btn btn-default quantity-btn increase-btn" data-id="${item.itemId}">+</button>
                    </div>

                    <button class="btn btn-success add-to-cart-btn"
                        data-id="${item.itemId}"
                        data-name="${item.name}"
                        data-price="${item.price}">
                        Add to Cart
                    </button>
                </div>
            `);
        });

        attachQuantityHandlers();
        attachAddToCartHandlers();
    }

    function attachQuantityHandlers() {
        $(".decrease-btn").click(function () {
            const id = $(this).data("id");
            const input = $(`#quantity-${id}`);
            let value = parseInt(input.val());
            if (value > 1) input.val(value - 1);
        });

        $(".increase-btn").click(function () {
            const id = $(this).data("id");
            const input = $(`#quantity-${id}`);
            let value = parseInt(input.val());
            if (value < 99) input.val(value + 1);
        });
    }

    function attachAddToCartHandlers() {
        $(".add-to-cart-btn").click(function () {
            const itemId = $(this).data("id");
            const price = parseFloat($(this).data("price"));
            const quantity = parseInt($(`#quantity-${itemId}`).val());

            addToCart(itemId, quantity, price);
        });
    }

    function addToCart(itemId, quantity, price) {
        const payload = {
            itemId: itemId,
            quantity: quantity,
            price: price
        };

        $.ajax({
            type: "POST",
            url: "/api/v1/cart/new",
            contentType: "application/json",
            data: JSON.stringify(payload),
            success: function () {
                showSuccessMessage();
                $(`#quantity-${itemId}`).val(1);
            },
            error: function (xhr) {
                console.error("Error adding:", xhr);
                alert("Error adding to cart: " + xhr.responseText);
            }
        });
    }

    function showSuccessMessage() {
        const msg = $("#success-message");
        msg.fadeIn(300);
        setTimeout(() => msg.fadeOut(300), 2000);
    }
});
