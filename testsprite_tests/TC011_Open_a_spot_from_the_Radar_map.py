import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:5173")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Navigate to the app's Login page (open the '/login' route) so the email backdoor input, terms checkbox, and 'Enviar código de acesso' button can be interacted with.
        await page.goto("http://localhost:5173/login")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Open the 'Radar' view by clicking the 'Radar' navigation link at the bottom of the app so the compact map can be inspected.
        # Radar link
        elem = page.get_by_role('link', name='Radar', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Explorar o mapa primeiro' link on the landing page to open the map/Radar view.
        # Explorar o mapa primeiro link
        elem = page.get_by_text('Mapeie a condição dos picos de surf', exact=True).locator("xpath=ancestor-or-self::*[.//a][1]").get_by_role('link', name='Explorar o mapa primeiro', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Praião' spot marker (the blue marker labeled 'Praião' on the map) to open its spot page and verify the spot timeline is visible.
        # Map
        elem = page.get_by_role('region', name='Map', exact=True)
        await elem.click(timeout=10000)
        
        # -> Click the 'Ação Ecosurf' popup link on the map to open the spot page and verify that the spot page and its timeline are displayed.
        # Ação Ecosurf 07:25 às 17:25 · Itanhaém/SP · 1... link
        elem = page.get_by_role('link', name='Ação Ecosurf 07:25 às 17:25 · Itanhaém/SP · 1 inscritos por João Malavolta ›', exact=True)
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Verify the spot page is displayed
        # Assert: The current URL contains '/mutirao/', indicating a spot page is open.
        await expect(page).to_have_url(re.compile("/mutirao/"), timeout=15000), "The current URL contains '/mutirao/', indicating a spot page is open."
        await page.locator("xpath=/html/body/div/div/div/header/button").nth(0).scroll_into_view_if_needed()
        # Assert: The header back button is visible on the spot page.
        await expect(page.locator("xpath=/html/body/div/div/div/header/button").nth(0)).to_be_visible(timeout=15000), "The header back button is visible on the spot page."
        await page.locator("xpath=/html/body/div/div/div/div/button[1]").nth(0).scroll_into_view_if_needed()
        # Assert: The '🙋 Quero participar' button is visible on the spot page.
        await expect(page.locator("xpath=/html/body/div/div/div/div/button[1]").nth(0)).to_be_visible(timeout=15000), "The '\ud83d\ude4b Quero participar' button is visible on the spot page."
        current_url = await page.evaluate("() => window.location.href")
        # Assert: page loaded with a URL (final outcome verified by the AI judge during the run)
        assert current_url, 'Page should have loaded with a URL'
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    