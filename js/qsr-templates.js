/**
 * ezManage Multi-Chain QSR Templates & ServSafe Standards Engine
 * Provides authentic, real-world operational templates and ServSafe critical checkpoints
 * for 14 major quick-service restaurant chains.
 */

export const QSR_TEMPLATES = [
    {
        id: 'arbys',
        name: "Arby's",
        brandTag: "Roast Beef & QSR",
        category: "Sandwich & Deli",
        popularOrder: 1,
        description: "Standard high-volume roast beef operations with slicer cycles, continuous holding, and fryer stations.",
        inventory: [
            "Roast Beef (Cooked)",
            "Roast Beef (Raw Rolls)",
            "Curly Fries",
            "Crinkle Fries",
            "Mozzarella Sticks",
            "Turkey Breast",
            "Ham",
            "Slider Buns",
            "Sesame Seed Buns",
            "Turnovers (Apple/Cherry)",
            "Horsey Sauce",
            "Arby's Sauce",
            "Cheddar Cheese Sauce",
            "Vanilla Shake Mix"
        ],
        routines: [
            "Parking Lot & Exterior Grounds Check",
            "Lobby, Dining Room & Restrooms Cleanliness",
            "ServSafe Hot & Cold Line Food Temperatures",
            "Filtered Fryers & Shortening TPM Quality Check",
            "Trash Run & Dumpster Enclosure Padlock Check",
            "Walk-In Cooler/Freezer Temps (below 40°F / 0°F)",
            "Hot Holding Line Temps (above 135°F)",
            "Roast Beef Slicer Sanitization (4-Hour Cycle)",
            "Quat/Chlorine Sanitizer Bucket PPM Test (200-400 PPM)",
            "FIFO Date Marking & 7-Day Discard Audit",
            "Handwashing Sink Soap/Towel Stock & 100°F Water",
            "Raw vs. Ready-to-Eat Cross-Contamination Check",
            "Ice Machine Chute & Scoop Sanitization",
            "Hood Vent / Ansul System Visual Check"
        ],
        drawers: [
            { name: "Front Counter 1", amount: "100.00" },
            { name: "Front Counter 2", amount: "100.00" },
            { name: "Drive-Thru 1", amount: "150.00" }
        ]
    },
    {
        id: 'chickfila',
        name: "Chick-fil-A",
        brandTag: "Chicken & Hospitality",
        category: "Chicken QSR",
        popularOrder: 2,
        description: "Pressure fryer protocols, strict kanban warming holding times, fresh produce prep, and 'Core 4' hospitality.",
        inventory: [
            "CFA Filets (Fresh Raw)",
            "Spicy Filets (Fresh Raw)",
            "Nuggets (Raw Breasted)",
            "Chick-n-Strips (Raw)",
            "Waffle Potato Fries",
            "Milk & Egg Wash",
            "Coater / Breading Flour",
            "100% Refined Peanut Oil",
            "Canola Oil (Fryer)",
            "Butter Brioche Buns",
            "White Seeded Buns",
            "Mac & Cheese Trays",
            "Fresh Squeezed Lemon Juice",
            "Icedream Liquid Mix",
            "Chick-fil-A Sauce (Bulk)"
        ],
        routines: [
            "Henny Penny Pressure Fryer Filtration & Peanut Oil Scrub",
            "Kanban Warming Chute Holding Temps (Min 140°F)",
            "Fresh Lemon Squeezing & Produce Rotation (FIFO)",
            "Dining Room 'Core 4' Table Touchpoints & Hospitality Check",
            "Raw Chicken Prep Station vs. Breaded Racks Isolation",
            "Waffle Fry Open Fryers Quality & Salting Station Check",
            "Icedream / Milkshake Machine Calibration & Sanitization",
            "Quat Sanitizer Bucket Test (200-400 PPM)",
            "Walk-In Cooler Temps (<40°F) & Holding Pans Audit",
            "Handwashing Timers & Paper Towel Re-Stock",
            "Ice Machine Chute & Covered Scoop Inspection",
            "Drive-Thru Mobile Canopy & Face-to-Face Order Tracking"
        ],
        drawers: [
            { name: "Front Register 1", amount: "150.00" },
            { name: "Drive-Thru Cockpit 1", amount: "150.00" },
            { name: "Drive-Thru Cockpit 2", amount: "150.00" }
        ]
    },
    {
        id: 'mcdonalds',
        name: "McDonald's",
        brandTag: "Burgers & High-Volume QSR",
        category: "Burger QSR",
        popularOrder: 3,
        description: "Dual-platen clamshell grill calibration, UHC cabinet timing, Taylor heat-treat cycles, and drive-thru pull bays.",
        inventory: [
            "10:1 Beef Patties",
            "4:1 Fresh Beef Patties",
            "Chicken McNuggets",
            "McChicken Patties",
            "Filet-O-Fish Portions",
            "World Famous Fries",
            "Regular Buns",
            "Quarter Pounder Buns",
            "Big Mac Sauce",
            "Dehydrated Rehydrated Onions",
            "Fresh Slivered Onions",
            "Pasteurized American Cheese",
            "Shake / McFlurry Dairy Mix",
            "Sundae Dairy Mix"
        ],
        routines: [
            "Clamshell Grill Platen Calibration & Top Heat Check",
            "Taylor Shake / McFlurry Daily Heat-Treat Cycle Verification",
            "Universal Holding Cabinet (UHC) Timers & Product Integrity",
            "Drive-Thru Pull Bays & Presenter Speed Tracking",
            "Fries Hopper Temperature & Shortening Filtration",
            "Internal Beef Cooked Temp Audit (Min 155°F)",
            "Raw Beef Dedicated Blue Glove Protocol Check",
            "Walk-In Cooler/Freezer Digital Thermometer Log (<40°F / 0°F)",
            "Three-Compartment Sink Chemical PPM Verification",
            "Lobby Restroom 30-Minute Clean & Restock Log",
            "Drink Station & Syrup Box Bib Connection Inspection",
            "Automated Beverage System (ABS) Calibration"
        ],
        drawers: [
            { name: "Cash Window 1", amount: "150.00" },
            { name: "Cash Window 2", amount: "150.00" },
            { name: "Front Counter 1", amount: "100.00" }
        ]
    },
    {
        id: 'papajohns',
        name: "Papa Johns",
        brandTag: "Pizza & Delivery Operations",
        category: "Pizza Delivery",
        popularOrder: 4,
        description: "Cold dough proofing tray rotation, makeline rail temps, continuous conveyor bake calibration, and driver drops.",
        inventory: [
            "Dough Balls (Large 14in)",
            "Dough Balls (Medium 12in)",
            "Dough Balls (Small 10in)",
            "Vine-Ripened Pizza Sauce",
            "100% Real Mozzarella Blend",
            "Sliced Pepperoni",
            "Italian Sausage",
            "Beef Crumble Topping",
            "Smoked Bacon Strips",
            "Special Garlic Dipping Sauce",
            "Pepperoncini Peppers",
            "Large Pizza Boxes",
            "Pre-Cooked Chicken Wings"
        ],
        routines: [
            "Dough Proofing Temperature & Tray Rotation (Walk-in to Staging)",
            "Makeline Refrigerated Rail Temps (<40°F)",
            "Middleby Marshall Oven Conveyor Speed & Bake Temp (450°F-500°F)",
            "Driver Dispatch Lockbox Audit & Driver Bank Cash Drop Limit ($20 max)",
            "Pizza Rocker Knife & Cutting Surface Sanitization",
            "Cold Cheese & Vegetable Rail Refill Rotation (FIFO)",
            "Handwashing Sink 100°F Water & Anti-Bacterial Soap Audit",
            "Quat Sanitizer ppm Test on Makeline Wipe Towels",
            "Walk-In Cooler Temp & Fan Condensation Inspection",
            "Heated Delivery Bag Inspection & Cord Continuity",
            "Till Reconciliation & Driver Shift Mileage Log"
        ],
        drawers: [
            { name: "Front Counter / Pickup", amount: "100.00" },
            { name: "Driver Dispatch Bank 1", amount: "20.00" },
            { name: "Driver Dispatch Bank 2", amount: "20.00" }
        ]
    },
    {
        id: 'wendys',
        name: "Wendy's",
        brandTag: "Fresh Beef Burgers & Chili",
        category: "Burger QSR",
        popularOrder: 5,
        description: "Fresh never-frozen beef grill sear procedures, chili staging & pasteurization hold, and Frosty hopper temps.",
        inventory: [
            "Fresh Beef Patties (Single 4oz)",
            "Fresh Beef Patties (Junior 2oz)",
            "Homestyle Chicken Breast",
            "Spicy Chicken Breast",
            "Natural-Cut Skin-On Fries",
            "Chili Meat Reserve",
            "Chili Seasoning & Beans Base",
            "Sandwich Buns (Standard)",
            "Brioche Buns",
            "Chocolate Frosty Liquid Mix",
            "Vanilla Frosty Liquid Mix",
            "Applewood Smoked Bacon",
            "Asiago & Cheddar Slices"
        ],
        routines: [
            "Fresh Never Frozen Beef Flat-Top Grill Sear & Temp Audit",
            "Chili Meat Holding Temperature & Safe Chilling Protocol",
            "Frosty Machine Mix Level & Freeze Cylinder Temp Log",
            "Fryer Shortening Filtration & TPM Oil Quality Test",
            "Fresh Produce Sink Wash & Sanitization Cycle",
            "Hot Holding Wells & Bacon Staging Inspection (>135°F)",
            "Walk-In Cooler Temperature Check (<40°F)",
            "Three-Compartment Sink Sanitizer PPM Test",
            "Dining Room & Restroom Hourly Inspection",
            "Drive-Thru Timer System Calibration"
        ],
        drawers: [
            { name: "Front Register 1", amount: "100.00" },
            { name: "Drive-Thru Register 1", amount: "150.00" }
        ]
    },
    {
        id: 'tacobell',
        name: "Taco Bell",
        brandTag: "Mexican QSR & Retherm",
        category: "Mexican QSR",
        popularOrder: 6,
        description: "Hot water bath rethermalizer standards, cold rail ingredient staging, 4-hour pan rotation, and tortilla steaming.",
        inventory: [
            "Seasoned Beef (Retherm Bags)",
            "All-White Meat Shredded Chicken",
            "Grilled Marinated Steak",
            "Nacho Cheese Sauce",
            "Refried Pinto Beans",
            "Black Beans",
            "Flour Tortillas (10.25in)",
            "Flour Tortillas (12in)",
            "Crunchy Corn Taco Shells",
            "Shredded Cheddar Cheese",
            "Reduced-Fat Sour Cream",
            "Cinnabon Delights (Frozen)",
            "Mild, Hot & Fire Sauce Packets"
        ],
        routines: [
            "Rethermalizer Water Temperature Verification (Min 165°F)",
            "Cold Line Rail Ingredients Temperature Audit (<40°F)",
            "4-Hour Pan Rotation & Hot Holding Carryover Standards",
            "Tortilla Press & Steamer Platen Sanitization",
            "Fryer Oil Quality & Cinnamon Twist Prep Audit",
            "Walk-In Cooler/Freezer Thermometers Log",
            "Quat Sanitizer Wipe Buckets (200-400 PPM)",
            "Drive-Thru Speed & Order Accuracy Screen Review",
            "Lobby Restroom & Beverage Station Sanitation"
        ],
        drawers: [
            { name: "Front Counter 1", amount: "100.00" },
            { name: "Drive-Thru 1", amount: "150.00" }
        ]
    },
    {
        id: 'burgerking',
        name: "Burger King",
        brandTag: "Flame-Broiled Burgers & PHU",
        category: "Burger QSR",
        popularOrder: 7,
        description: "Flame broiler chain speed calibration, Product Holding Unit (PHU) timers, and tomato slicer cycle hygiene.",
        inventory: [
            "Whopper Beef Patties (4:1)",
            "Junior Beef Patties (10:1)",
            "Original Long Chicken Patties",
            "Chicken Fries",
            "Piping Hot French Fries",
            "Thick-Cut Onion Rings",
            "Sesame Seed Whopper Buns",
            "Specialty Long Buns",
            "Pasteurized American Cheese",
            "Crispy Bacon Strips",
            "Dill Pickles & White Onions",
            "Zesty Ring Dipping Sauce"
        ],
        routines: [
            "Flexible Batch Broiler (FBB) Burner & Speed Check",
            "Product Holding Unit (PHU) Time & Temperature Settings",
            "Automated Fryer Filtration & Salt Dispenser Calibration",
            "Tomato Slicer & Prep Table 4-Hour Sanitization",
            "Walk-In Cooler & Deep Freezer Temperature Verification",
            "Sanitizer Sink & Red Bucket Chemical PPM Audit",
            "Handwash Stations Hot Water (100°F) & Soap Dispensers",
            "Drive-Thru Timer System & Window Speed Tracking"
        ],
        drawers: [
            { name: "Front Counter 1", amount: "100.00" },
            { name: "Drive-Thru 1", amount: "150.00" }
        ]
    },
    {
        id: 'chipotle',
        name: "Chipotle Mexican Grill",
        brandTag: "Fast Casual & Food Safety Protocol",
        category: "Fast Casual Mexican",
        popularOrder: 8,
        description: "Stringent HACCP blanching protocols (212°F), raw meat grill cook-off targets, and Victory Wash wash basins.",
        inventory: [
            "Raw Marinated Chicken",
            "Raw Adobo Steak",
            "Braised Barbacoa",
            "Braised Carnitas",
            "White Basmati Rice",
            "Brown Basmati Rice",
            "Simmered Black Beans",
            "Simmered Pinto Beans",
            "Fajita Bell Peppers & Onions",
            "Hass Avocados (Case)",
            "Fresh Cilantro Bunches",
            "Crisp Romaine Lettuce",
            "Monterey Jack Cheese Blocks",
            "Cultured Sour Cream",
            "Fresh Tomatillo Salsas"
        ],
        routines: [
            "5-Second Citrus & Avocado Blanching at 212°F Boiling Water",
            "Raw Chicken (165°F) & Raw Steak (140°F) Cook Temp Validation",
            "Hourly Chime Handwashing Cycle & Manager Wellness Log",
            "Cold Well Line Temperature Log (All items strictly <40°F)",
            "Hot Holding Wells Temperature Log (All items strictly >140°F)",
            "Victory Wash Produce Sanitation PPM & Rinse Inspection",
            "Walk-In Cooler HACCP Labeling & Daily Audit",
            "Dining Room Table Disinfection & Trash Compactor Check"
        ],
        drawers: [
            { name: "Main POS Register 1", amount: "150.00" },
            { name: "Main POS Register 2", amount: "150.00" }
        ]
    },
    {
        id: 'zaxbys',
        name: "Zaxby's",
        brandTag: "Chicken Fingers & Wings",
        category: "Chicken QSR",
        popularOrder: 9,
        description: "Fresh hand-breaded tenders, open/pressure fryer oil management, sauce nozzle teardown, and Texas toast grilling.",
        inventory: [
            "Fresh Raw Chicken Tenders",
            "Bone-In Chicken Wings",
            "Boneless Chicken Wings",
            "Thick-Sliced Texas Toast",
            "Crinkle-Cut French Fries",
            "Fried Cheddar Bites",
            "Signature Zax Sauce",
            "Tongue Torch Sauce",
            "Wimpy Mild Buffalo Sauce",
            "Zesty Ranch Dressing",
            "Coleslaw Slaw Dressing",
            "Tender Breading Seasoning"
        ],
        routines: [
            "Henny Penny Open & Pressure Fryers Oil Filtration",
            "Fresh Tender Breading Station Flour Sifting & Temp Safety",
            "Hot Holding Cabinet Tender & Wing Internal Temperatures (>140°F)",
            "Sauce Bar Pump Tear-Down, Cleaning & Sanitization",
            "Ice Machine Chute Swab & Clean Scoop Verification",
            "Walk-In Cooler Air Temp & Chicken Tray Drip Pans (<40°F)",
            "Chemical Sanitizer PPM Test in Sinks & Workstation Buckets",
            "Drive-Thru Headsets & Window Ticket Times Audit"
        ],
        drawers: [
            { name: "Front Register 1", amount: "100.00" },
            { name: "Drive-Thru 1", amount: "150.00" }
        ]
    },
    {
        id: 'subway',
        name: "Subway",
        brandTag: "Fresh Sandwiches & Proofer",
        category: "Sandwich QSR",
        popularOrder: 10,
        description: "Sub roll humidity proofing, bain-marie cold sandwich rail temperatures, and deli slicer teardown intervals.",
        inventory: [
            "Italian White Bread Sticks",
            "9-Grain Wheat Bread Sticks",
            "Italian Herbs & Cheese Seasoning",
            "Sliced Turkey Breast",
            "Sliced Black Forest Ham",
            "Deli Roast Beef",
            "Tuna Salad Mix",
            "Meatballs in Marinara Sauce",
            "Provolone Cheese Slices",
            "American Cheese Slices",
            "Fresh Shredded Lettuce",
            "Sliced Ripe Tomatoes",
            "Sliced Cucumbers",
            "Dill Pickles & Black Olives"
        ],
        routines: [
            "Bread Proofer Humidity & Conveyor Oven Bake Temp Check",
            "Sandwich Bain-Marie Cold Well Temperature (<40°F)",
            "Deli Meat Slicer 4-Hour Tear-Down & Sanitization Cycle",
            "Tuna Salad Thaw Log & Mayo Incorporation Standards",
            "Fresh Vegetable Slicer Sanitization & FIFO Date Labels",
            "Meatball Warmer Internal Temperature Holding (Min 140°F)",
            "Sanitizer Sink Concentration PPM & Quat Towel Buckets",
            "Front Counter Sneeze Guard Glass Cleaning"
        ],
        drawers: [
            { name: "POS Terminal 1", amount: "100.00" },
            { name: "POS Terminal 2", amount: "100.00" }
        ]
    },
    {
        id: 'starbucks',
        name: "Starbucks",
        brandTag: "Coffeehouse & Espresso Bar",
        category: "Coffee & Beverage",
        popularOrder: 11,
        description: "Mastrena II espresso extraction calibration, undercounter dairy refrigeration, and pastry case FIFO rotation.",
        inventory: [
            "Espresso Roast Whole Bean",
            "Blonde Espresso Whole Bean",
            "Whole Milk Gallons",
            "2% Reduced Fat Milk Gallons",
            "Oatmilk (Barista Edition)",
            "Almondmilk",
            "Vanilla Flavor Syrup",
            "Caramel Drizzle Sauce",
            "Mocha Sauce Base",
            "Spiced Chai Concentrate",
            "Matcha Tea Powder",
            "Coffee Frappuccino Base",
            "Birthday Cake Pops",
            "Butter Croissants"
        ],
        routines: [
            "Mastrena II Espresso Machine Daily Calibration & Cleaning Cycle",
            "Undercounter Milk Refrigerator Temperature Log (<40°F)",
            "Steaming Pitcher Rinser Sinks & Sanitizer Dip Well Hygiene",
            "Ditting Bulk Coffee Grinder Burr Brush & Clean-Out",
            "Ice Machine Chute Sanitization & Scoop Holster Check",
            "Pastry Case & Food Warming Oven FIFO Expiration Audit",
            "Handwashing Sinks 100°F Water & Soap Inspection",
            "Cafe Seating, Condiment Bar & Restroom Cleanliness Log"
        ],
        drawers: [
            { name: "Front POS 1", amount: "100.00" },
            { name: "Drive-Thru Bar POS", amount: "100.00" }
        ]
    },
    {
        id: 'dominos',
        name: "Domino's",
        brandTag: "Pizza & Delivery Express",
        category: "Pizza Delivery",
        popularOrder: 12,
        description: "Dough fermentation bubble audits, makeline rail pit cleaning, conveyor bake verification, and driver cash safety.",
        inventory: [
            "Large Dough Trays (14in)",
            "Medium Dough Trays (12in)",
            "Pan Dough Trays",
            "Robusto Pizza Sauce",
            "Shredded Pizza Cheese (Part-Skim Mozzarella)",
            "Sliced Cupping Pepperoni",
            "Savory Italian Sausage",
            "Grilled Chicken Strips",
            "Jalapeno Peppers",
            "Garlic Herb Crust Oil",
            "Medium & Large Pizza Boxes",
            "Oven-Baked Chicken Wings",
            "Chocolate Lava Crunch Cakes"
        ],
        routines: [
            "Walk-In Dough Proofing Chamber & Bubble Audit",
            "Makeline Ingredient Rail Cold Wells (Below 40°F)",
            "Continuous Chain Oven Temp (450°F-475°F) & Belt Speed",
            "Driver Cash Drop Lockbox & Safe Drop Compliance ($20 max in car)",
            "Cut Table Rocker Knives & Shovels Sanitization",
            "Hot Delivery Bags & Car Top Sign Cord Inspections",
            "Three-Compartment Dish Sink Quat PPM Test",
            "Walk-In Cooler Condenser Coils & Door Gasket Inspection"
        ],
        drawers: [
            { name: "Carryout Counter", amount: "100.00" },
            { name: "Driver Bank Safe", amount: "50.00" }
        ]
    },
    {
        id: 'culvers',
        name: "Culver's",
        brandTag: "ButterBurgers & Fresh Custard",
        category: "Burger & Custard QSR",
        popularOrder: 13,
        description: "Fresh beef ball flat-grill smash sear, custard machine barrel freezing audits, and dining room table tent hospitality.",
        inventory: [
            "Fresh Beef Balls (Unfrozen)",
            "Lightly Buttered Buns",
            "Fresh Liquid Custard Mix (Vanilla)",
            "Fresh Liquid Custard Mix (Chocolate)",
            "Crispy Crinkle Cut Fries",
            "Wisconsin Cheese Curds",
            "Thick-Cut Onion Rings",
            "Real Wisconsin Cheddar Slices",
            "Thick-Cut Smoked Bacon",
            "Dill Pickle Chips & Sliced Red Onions",
            "Hot Soup Bases (Chicken Noodle / Chili)"
        ],
        routines: [
            "ButterBurger Flat Grill Sear Temp & Bun Toaster Butter Roller",
            "Fresh Frozen Custard Machine Hopper & Barrel Freezing Temps",
            "Fryers Shortening Quality & Filtration Routine",
            "Steam Table Soup & Gravy Temperature Validation (>140°F)",
            "Fresh Produce Prep Table & Lettuce Sanitization",
            "Dining Room Blue Table Tent Runner Hospitality Walk",
            "Walk-In Cooler & Custard Freezer Digital Log (<40°F / -10°F)",
            "Sanitizer PPM Testing Across All Kitchen Prep Stations"
        ],
        drawers: [
            { name: "Front POS 1", amount: "100.00" },
            { name: "Front POS 2", amount: "100.00" },
            { name: "Drive-Thru 1", amount: "150.00" }
        ]
    },
    {
        id: 'panera',
        name: "Panera Bread",
        brandTag: "Bakery-Cafe & Fresh Soups",
        category: "Fast Casual Bakery",
        popularOrder: 14,
        description: "Deck oven steam injection calibration, soup thermalizer rethermalization, and Day-End Dough-Nation donation audits.",
        inventory: [
            "Country Rustic Sourdough Dough",
            "French Baguette Dough",
            "Artisan Bagel Dough (Cinnamon Crunch / Everything)",
            "Broccoli Cheddar Soup Bags",
            "Creamy Tomato Soup Bags",
            "Citrus-Herb Smoked Chicken Breast",
            "Thick Applewood Bacon",
            "Organic Romaine & Arugula Greens",
            "Hass Avocados",
            "Aged Fontina & Mozzarella Cheeses",
            "Plain & Honey Walnut Cream Cheese",
            "Kraft Bakery & Bagel Boxes"
        ],
        routines: [
            "Deck / Rack Oven Steam Injection & Hearth Baking Calibration",
            "Soup Thermalizer Retherm Log & Hot Hold Monitoring (>165°F)",
            "Cold Sandwich & Salad Line Wells (Below 40°F)",
            "Bagel Slicer Blade Guard & Sanitization Check",
            "Fresh Herb & Produce Wash Sink PPM Verification",
            "Barista Coffee & Hot Tea Urn Descaling and Water Temp",
            "Nightly Leftover Bakery 'Day-End Dough-Nation' Audit",
            "Restroom 1-Hour Hospitality Check & Soap Dispensers"
        ],
        drawers: [
            { name: "Bakery Counter 1", amount: "100.00" },
            { name: "Cafe Express POS 2", amount: "100.00" }
        ]
    }
];

/**
 * Returns all available multi-chain QSR templates.
 */
export function getQSRTemplates() {
    return QSR_TEMPLATES;
}

/**
 * Finds a specific template by brand identifier.
 */
export function getQSRTemplateById(id) {
    if (!id) return null;
    return QSR_TEMPLATES.find(t => t.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Searches and sorts QSR templates based on user query and sort preference.
 * 
 * @param {Array} templates Array of templates to filter
 * @param {string} query Search keyword
 * @param {string} sortBy 'alpha' (A-Z) or 'recent' (Popularity order)
 * @returns {Array} Filtered and sorted template list
 */
export function searchAndSortTemplates(templates = QSR_TEMPLATES, query = '', sortBy = 'recent') {
    let results = [...templates];

    if (query && query.trim() !== '') {
        const q = query.trim().toLowerCase();
        results = results.filter(t => 
            t.name.toLowerCase().includes(q) ||
            t.brandTag.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.inventory.some(i => i.toLowerCase().includes(q)) ||
            t.routines.some(r => r.toLowerCase().includes(q))
        );
    }

    if (sortBy === 'alpha') {
        results.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        // 'recent' sorts by popularity/priority order
        results.sort((a, b) => (a.popularOrder || 99) - (b.popularOrder || 99));
    }

    return results;
}

/**
 * Returns structured food safety standards, danger zones, cooling rules,
 * sanitizer PPM levels, and verified external authority URLs.
 */
export function getServSafeStandards() {
    return {
        dangerZone: {
            title: "Temperature Danger Zone",
            minF: 41,
            maxF: 135,
            minC: 5,
            maxC: 57,
            description: "Bacteria multiply most rapidly between 41°F and 135°F (5°C to 57°C). TCS foods must never remain in this range for more than 4 hours total."
        },
        coolingRules: {
            title: "Two-Stage Cooling Process",
            stage1: "Cool cooked food from 135°F down to 70°F within 2 hours.",
            stage2: "Cool from 70°F down to 41°F or lower within an additional 4 hours.",
            totalMaxHours: 6,
            description: "Total cooling time cannot exceed 6 hours. If food has not reached 70°F within 2 hours, it must be reheated to 165°F for 15s and restarted or discarded."
        },
        sanitizerPPM: [
            {
                chemical: "Quaternary Ammonium (Quat)",
                targetRange: "200 – 400 PPM",
                waterTemp: "Min 75°F (24°C)",
                contactTime: "Min 30 – 60 seconds",
                note: "Test using Quat chemical indicator paper test strips."
            },
            {
                chemical: "Chlorine / Bleach Solution",
                targetRange: "50 – 100 PPM",
                waterTemp: "75°F – 100°F (24°C – 38°C)",
                contactTime: "Min 10 seconds",
                note: "Do not exceed 100 PPM as it may corrode stainless steel and leave toxic residue."
            },
            {
                chemical: "Iodine Solution",
                targetRange: "12.5 – 25 PPM",
                waterTemp: "Min 68°F (20°C)",
                contactTime: "Min 30 seconds",
                note: "Water pH must be below 5.0 or per manufacturer instructions."
            }
        ],
        cookingTemps: [
            { tempF: 165, tempC: 74, holdSec: 1, food: "Poultry (chicken, turkey), stuffing, reheated TCS leftovers" },
            { tempF: 155, tempC: 68, holdSec: 17, food: "Ground beef, ground pork, mechanically tenderized meats" },
            { tempF: 145, tempC: 63, holdSec: 15, food: "Whole steaks, pork chops, seafood, eggs for immediate service" },
            { tempF: 135, tempC: 57, holdSec: 1, food: "Hot-held cooked vegetables, rice, beans, pasta, fruits" },
            { tempF: 40, tempC: 4.4, holdSec: 0, food: "Cold holding threshold (walk-in coolers, sandwich make rails)" },
            { tempF: 0, tempC: -18, holdSec: 0, food: "Deep chill & commercial walk-in freezer storage" }
        ],
        externalResources: [
            {
                name: "ServSafe Official Portal",
                url: "https://www.servsafe.com/",
                description: "Official National Restaurant Association training, certification & food handler guidelines."
            },
            {
                name: "FDA Food Code (Current Edition)",
                url: "https://www.fda.gov/food/retail-food-industry/fda-food-code",
                description: "Federal model for food safety regulation at retail and food service establishments."
            },
            {
                name: "CDC Food Safety Guidelines",
                url: "https://www.cdc.gov/food-safety/",
                description: "Centers for Disease Control recommendations for foodborne illness prevention."
            },
            {
                name: "Inspections Online / Health Dept Lookup",
                url: "https://www.inspectionsonline.us/",
                description: "National repository for state and county local health inspection reports."
            }
        ]
    };
}

if (typeof window !== 'undefined') {
    window.QSRTemplates = {
        QSR_TEMPLATES,
        getQSRTemplates,
        getQSRTemplateById,
        searchAndSortTemplates,
        getServSafeStandards
    };
}

