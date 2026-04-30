import { loadFooter } from './footer';

describe('loadFooter', () => {
    beforeEach(() => {
        // Set up the DOM before each test
        document.body.innerHTML = '<div class="main-footer"></div>';
    });

    afterEach(() => {
        // Clean up the DOM after each test
        document.body.innerHTML = '';
    });

    it('should inject the footer HTML into the .main-footer element if it exists', () => {
        loadFooter();

        const footerElement = document.querySelector('.main-footer');
        expect(footerElement).not.toBeNull();
        expect(footerElement.innerHTML).toContain('class="footer-container"');
        expect(footerElement.innerHTML).toContain('Navigate');
        expect(footerElement.innerHTML).toContain('Connect');
        expect(footerElement.innerHTML).toContain('Company');
        expect(footerElement.innerHTML).toContain('Stay in the Loop');
        expect(footerElement.innerHTML).toContain('Sign Up');
        expect(footerElement.innerHTML).toContain('2026 Unstoppable LLC. All Rights Reserved.');
    });

    it('should not throw an error if the .main-footer element does not exist', () => {
        document.body.innerHTML = '<div>No footer here</div>';

        expect(() => loadFooter()).not.toThrow();
    });
});
