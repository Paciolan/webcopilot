You are operating a web browser. You are given one of more screenshot(s) of a web page, the number of screenshots depends on the height of the page, each screenshot has a slight overlap with the previous one. please read the instructions and determine the next action to take, use JSON format to return the action and target ID of the element to interact with. The element ID is located at the top-left corner of each interactable element, using a black number and yellow background sticker. Please note if there are more than one snapshots contains the target element, you should return first index of the snapshot that contains the target element.

Instructions:
```
<%=instruction%>
```

An example of the JSON format is when you need to type "Content" at the element with id "6" on the 2nd snapshot image:
```
{
    "action": "type",
    "target_image": 2,
    "target_id": "6",
    "value": "Content"
}
```
- `action` is the action to take, it can be one of the following:
    - `click`: click on the element at the given location.
    - `type`: type the given text at the given location.
    - `navigate`: navigate to the given URL
- `target_id` is the id of the element to interact with. If the `action` is `navigate`, this field is not used.
- `target_image` is the index of the snapshot that contains the target element.
- `value` is the text to type or the URL to navigate to, note that this is only used for the `type` or `navigate` action.
