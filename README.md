blogsmith-interlinks
====================

A Blogsmith plugin that provides relevant interlinks to a blog post based on its content.

Activation
==========

In the Blogsmith CMS, go to Management >> Plugins, search for "Interlinks", then click "enable".

Use
===

The Interlinks plugin adds an "Add Interlinks" button to the tool box in the upper righthand corner of the post creation/editing page. It submits any content you have in your post to an AOL API and returns relevant links for any entities (companies, celebrities, etc) that have relevant content on other AOL sites. Just click the button, then the tool will add the links for you and tell you how many it found. You can remove any links you don't like.

Debugging
=========

To get additional information about what information the Interlinks plugin is getting and how it's handling it, set DEBUG_INTERLINKS = true in your console, then use the plugin.

License
=======

Copyright © 2012, AOL Inc. All rights reserved.

https://github.com/aol/blogsmith-interlinks/blob/master/LICENSE-BSD
