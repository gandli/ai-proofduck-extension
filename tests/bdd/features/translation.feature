Feature: Translation Functionality

  Scenario: User translates text from English to Chinese
    Given the user has the extension popup open
    When the user selects "English" as source language
    And the user selects "Chinese" as target language
    And the user enters "Hello, world!" in the input field
    And the user clicks the translate button
    Then the translation result should be displayed
    And the result should contain "你好"

  Scenario: User switches between tabs
    Given the user has the extension popup open
    When the user clicks on the "Proofreading" tab
    Then the proofreading input field should be visible
    When the user clicks on the "Polishing" tab
    Then the polishing input field should be visible